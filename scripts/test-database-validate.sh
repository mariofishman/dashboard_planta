#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

mode="${1:-health}"
[[ "$mode" =~ ^(health|baseline|pre-unlock|quick-locked|quick-capability)$ ]] || die "usage: $0 {health|baseline|pre-unlock|quick-locked|quick-capability}"
require_safe_target
require_running_attested_runtime
if [[ "$mode" != "quick-locked" && "$mode" != "quick-capability" ]]; then
  require_protected_dump
fi
if [[ "$mode" == "health" ]]; then
  [[ -s "$test_db_ready" ]] || die "database is not marked ready; run a successful guarded reset"
fi
mkdir -p "$test_db_evidence"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
report="$test_db_evidence/validation-$mode-$timestamp.txt"
latest="$test_db_evidence/latest-$mode-validation.txt"
: > "$report"

query_value() { mysql_query reset "$1"; }
expect_value() {
  local label="$1" sql="$2" expected="$3" actual
  actual="$(query_value "$sql")"
  [[ "$actual" == "$expected" ]] || die "$label: expected $expected, found $actual"
  echo "$label=$actual" >> "$report"
}
expect_root_value() {
  local label="$1" sql="$2" expected="$3" actual
  actual="$(mysql_query root "$sql")"
  [[ "$actual" == "$expected" ]] || die "$label: expected $expected, found $actual"
  echo "$label=$actual" >> "$report"
}

if [[ "$mode" == "quick-locked" ]]; then
  echo "validated_at=$timestamp" >> "$report"
  echo "mode=$mode" >> "$report"
  expect_root_value version "SELECT VERSION()" "8.0.43"
  expect_root_value database_present "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$TEST_DB_NAME'" "1"
  expect_root_value application_accounts_locked "SELECT COUNT(*) FROM mysql.user WHERE user IN ('alertas_fake','monitor_source_ro') AND account_locked='Y'" "2"
  cp "$report" "$latest"
  echo "Validation passed ($mode): $latest"
  exit 0
fi

if [[ "$mode" == "quick-capability" ]]; then
  echo "validated_at=$timestamp" >> "$report"
  echo "mode=$mode" >> "$report"
  expect_root_value application_accounts_unlocked "SELECT COUNT(*) FROM mysql.user WHERE user IN ('alertas_fake','monitor_source_ro') AND account_locked='N'" "2"
  mysql_in_container writer --database="$TEST_DB_NAME" <<'SQL'
START TRANSACTION;
INSERT INTO `_prisma_migrations` (`id`,`checksum`,`migration_name`,`started_at`,`applied_steps_count`) VALUES ('monitor-quick-writer-proof','monitor-quick-writer-proof','monitor-quick-writer-proof',CURRENT_TIMESTAMP(3),0);
DELETE FROM `_prisma_migrations` WHERE `id`='monitor-quick-writer-proof';
ROLLBACK;
SQL
  mysql_query monitor "SELECT COUNT(*) FROM $TEST_DB_NAME._prisma_migrations" >/dev/null
  if mysql_query monitor "UPDATE $TEST_DB_NAME._prisma_migrations SET checksum=checksum WHERE 1=0" >/dev/null 2>"$test_db_evidence/quick-monitor-denial-$timestamp.txt"; then
    die "Monitor write unexpectedly succeeded"
  fi
  grep -Eq 'ERROR (1044|1142|1143).*denied' "$test_db_evidence/quick-monitor-denial-$timestamp.txt" || die "Monitor quick write failure was not access denied"
  echo "writer_transaction=passed" >> "$report"
  echo "monitor_read_and_denial=passed" >> "$report"
  cp "$report" "$latest"
  echo "Validation passed ($mode): $latest"
  exit 0
fi

echo "validated_at=$timestamp" >> "$report"
echo "mode=$mode" >> "$report"
echo "dump_sha256=$TEST_DB_DUMP_SHA256" >> "$report"
expect_value version "SELECT VERSION()" "8.0.43"
expect_value version_comment "SELECT @@version_comment" "MySQL Community Server - GPL"
expect_value tables "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' AND table_type='BASE TABLE'" "378"
expect_value views "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='$TEST_DB_NAME'" "111"
expect_value charset "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='$TEST_DB_NAME'" "utf8mb4"
expect_value collation "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='$TEST_DB_NAME'" "utf8mb4_0900_ai_ci"
expect_value lower_case_table_names "SELECT @@lower_case_table_names" "0"
expect_value transaction_isolation "SELECT @@global.transaction_isolation" "REPEATABLE-READ"
expect_value session_transaction_isolation "SELECT @@session.transaction_isolation" "REPEATABLE-READ"
expect_value global_sql_mode "SELECT @@global.sql_mode" ""
expect_value session_sql_mode "SELECT @@session.sql_mode" ""
expect_value global_time_zone "SELECT @@global.time_zone" "+00:00"
expect_value session_time_zone "SELECT @@session.time_zone" "+00:00"
expect_value system_time_zone "SELECT @@system_time_zone" "UTC"
expect_value local_infile "SELECT @@global.local_infile" "0"
expect_value skip_name_resolve "SELECT @@global.skip_name_resolve" "1"
expect_value innodb_page_size "SELECT @@global.innodb_page_size" "16384"
expect_value innodb_default_row_format "SELECT @@global.innodb_default_row_format" "dynamic"
expect_value triggers "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$TEST_DB_NAME'" "0"
expect_value routines "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='$TEST_DB_NAME'" "0"
expect_value events "SELECT COUNT(*) FROM information_schema.events WHERE event_schema='$TEST_DB_NAME'" "0"
expect_value view_invoker_security "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='$TEST_DB_NAME' AND security_type='INVOKER'" "111"
expect_value non_innodb_tables "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' AND table_type='BASE TABLE' AND engine<>'InnoDB'" "0"
expect_value unicode_ci_tables "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' AND table_type='BASE TABLE' AND table_collation='utf8mb4_unicode_ci'" "378"
expect_value tables_without_primary_key "SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_schema='$TEST_DB_NAME' AND t.table_type='BASE TABLE' AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints c WHERE c.table_schema=t.table_schema AND c.table_name=t.table_name AND c.constraint_type='PRIMARY KEY')" "2"

metadata_file="$test_db_evidence/schema-metadata-$timestamp.tsv"
: > "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'TABLE',table_name,engine,row_format,table_collation,create_options,IFNULL(table_comment,'') FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'COLUMN',table_name,column_name,ordinal_position,column_type,is_nullable,IFNULL(column_default,'<NULL>'),extra,IFNULL(character_set_name,'<NULL>'),IFNULL(collation_name,'<NULL>'),IFNULL(generation_expression,''),IFNULL(column_comment,'') FROM information_schema.columns WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,ordinal_position" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'INDEX',table_name,index_name,non_unique,seq_in_index,IFNULL(column_name,'<EXPRESSION>'),IFNULL(collation,''),IFNULL(sub_part,''),nullable,index_type,is_visible,IFNULL(expression,''),IFNULL(index_comment,'') FROM information_schema.statistics WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,index_name,seq_in_index" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'CONSTRAINT',table_name,constraint_name,constraint_type,enforced FROM information_schema.table_constraints WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,constraint_name" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'KEY',table_name,constraint_name,ordinal_position,column_name,IFNULL(referenced_table_name,''),IFNULL(referenced_column_name,'') FROM information_schema.key_column_usage WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,constraint_name,ordinal_position" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'FK',table_name,constraint_name,referenced_table_name,update_rule,delete_rule,match_option FROM information_schema.referential_constraints WHERE constraint_schema='$TEST_DB_NAME' ORDER BY table_name,constraint_name" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'CHECK',tc.table_name,cc.constraint_name,cc.check_clause FROM information_schema.check_constraints cc JOIN information_schema.table_constraints tc ON tc.constraint_schema=cc.constraint_schema AND tc.constraint_name=cc.constraint_name WHERE cc.constraint_schema='$TEST_DB_NAME' ORDER BY tc.table_name,cc.constraint_name" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'VIEW',table_name,check_option,is_updatable,security_type,character_set_client,collation_connection,view_definition FROM information_schema.views WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name" >> "$metadata_file"
metadata_digest="$(shasum -a 256 "$metadata_file" | awk '{print $1}')"
[[ "$TEST_DB_SCHEMA_METADATA_DIGEST" == "TO_BE_CAPTURED" || "$metadata_digest" == "$TEST_DB_SCHEMA_METADATA_DIGEST" ]] || die "schema metadata differs from the approved baseline"
echo "schema_metadata_digest=$metadata_digest" >> "$report"

expect_root_value monitor_schema_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.schema_privileges WHERE grantee=\"'monitor_source_ro'@'%'\" AND table_schema='$TEST_DB_NAME'" "SELECT,SHOW VIEW"
expect_root_value writer_schema_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.schema_privileges WHERE grantee=\"'alertas_fake'@'%'\" AND table_schema='$TEST_DB_NAME'" "DELETE,INSERT,SELECT,UPDATE"
expect_root_value reset_schema_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.schema_privileges WHERE grantee=\"'test_database_admin'@'%'\" AND table_schema='$TEST_DB_NAME'" "ALTER,CREATE,CREATE VIEW,DELETE,DROP,INDEX,INSERT,LOCK TABLES,REFERENCES,SELECT,SHOW VIEW,UPDATE"
expect_root_value monitor_global_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.user_privileges WHERE grantee=\"'monitor_source_ro'@'%'\"" "USAGE"

if [[ "$mode" == "pre-unlock" ]]; then
  expect_root_value application_accounts_locked "SELECT COUNT(*) FROM mysql.user WHERE user IN ('alertas_fake','monitor_source_ro') AND account_locked='Y'" "2"
  cp "$report" "$latest"
  echo "Pre-unlock validation passed: $latest"
  exit 0
fi

expect_root_value application_accounts_unlocked "SELECT COUNT(*) FROM mysql.user WHERE user IN ('alertas_fake','monitor_source_ro') AND account_locked='N'" "2"

# Compile every restored view as the actual Monitor account without returning data.
view_sql="$test_db_evidence/monitor-view-probe-$timestamp.sql"
mysql_query reset "SELECT CONCAT('SELECT * FROM ',CHAR(96),REPLACE(table_name,CHAR(96),CONCAT(CHAR(96),CHAR(96))),CHAR(96),' LIMIT 0;') FROM information_schema.views WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name" > "$view_sql"
mysql_in_container monitor --database="$TEST_DB_NAME" --batch --skip-column-names < "$view_sql" > /dev/null
echo "monitor_views_compiled=111" >> "$report"

if [[ "$mode" == "baseline" ]]; then
  manifest="${TEST_DB_SOURCE_MANIFEST:-$test_db_evidence/source-manifest.json}"
  if [[ -n "${TEST_DB_SOURCE_MANIFEST:-}" ]]; then
    [[ -f "$manifest" ]] || die "provided source manifest is missing"
    manifest_digest="$(shasum -a 256 "$manifest" | awk '{print $1}')"
    [[ "$manifest_digest" == "$TEST_DB_DUMP_MANIFEST_SHA256" ]] || die "provided source manifest is not the approved dump manifest"
  else
    manifest_digest="$(generate_dump_manifest "$manifest")"
  fi
  echo "source_manifest_sha256=$manifest_digest" >> "$report"
  count_sql="$test_db_evidence/exact-row-counts-$timestamp.sql"
  counts="$test_db_evidence/exact-row-counts-$timestamp.tsv"
  mysql_query reset "SELECT CONCAT('SELECT ',QUOTE(table_name),',COUNT(*) FROM ',CHAR(96),REPLACE(table_name,CHAR(96),CONCAT(CHAR(96),CHAR(96))),CHAR(96),';') FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' AND table_type='BASE TABLE' ORDER BY table_name" > "$count_sql"
  mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names < "$count_sql" > "$counts"
  auto_increments="$test_db_evidence/auto-increments-$timestamp.tsv"
  mysql_query reset "SELECT table_name,IFNULL(auto_increment,'<NULL>') FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' AND table_type='BASE TABLE' ORDER BY table_name" > "$auto_increments"
  table_ddl_sql="$test_db_evidence/show-create-tables-$timestamp.sql"
  view_ddl_sql="$test_db_evidence/show-create-views-$timestamp.sql"
  enum_count_sql="$test_db_evidence/enum-counts-$timestamp.sql"
  table_ddl="$test_db_evidence/show-create-tables-$timestamp.tsv"
  view_ddl="$test_db_evidence/show-create-views-$timestamp.tsv"
  enum_counts="$test_db_evidence/enum-counts-$timestamp.tsv"
  python3 "$repo_root/scripts/test-database-compare-manifest.py" \
    --manifest "$manifest" \
    --write-tables-sql "$table_ddl_sql" \
    --write-views-sql "$view_ddl_sql" \
    --write-enums-sql "$enum_count_sql"
  mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names < "$table_ddl_sql" > "$table_ddl"
  mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names < "$view_ddl_sql" > "$view_ddl"
  mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names < "$enum_count_sql" > "$enum_counts"
  python3 "$repo_root/scripts/test-database-compare-manifest.py" \
    --manifest "$manifest" \
    --counts "$counts" \
    --auto-increments "$auto_increments" \
    --show-create-tables "$table_ddl" \
    --show-create-views "$view_ddl" \
    --enum-counts "$enum_counts" >> "$report"

  expect_value a02_candidate_rows "SELECT COUNT(*) FROM test_database.flujo_materiales_detalles f JOIN test_database.ordenes_trabajo ot ON ot.id=f.id_orden_trabajo WHERE f.estado='TRANSITO' AND f.fecha_recepcion IS NULL AND f.fecha_eliminacion IS NULL AND f.id_orden_trabajo IS NOT NULL AND f.id_orden_trabajo_material IS NOT NULL AND ot.eliminado=0" "1249"
  expect_value a05_candidate_rows "SELECT COUNT(DISTINCT s.id) FROM test_database.articulo_serial s JOIN test_database.ordenes_trabajo ot ON ot.id=COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre) LEFT JOIN test_database.balanza_carga_detalle_registros scale ON scale.id_articulo_serial=s.id AND scale.eliminado=0 LEFT JOIN test_database.almacenes warehouse ON warehouse.id=s.id_almacen WHERE s.fecha_eliminacion IS NULL AND s.estado IN ('CONFIRMAR_PESO','DISPONIBLE') AND ((s.tipo='PRODUCTO_EN_PROCESO' AND s.id_orden_trabajo_origen IS NOT NULL) OR (s.tipo IN ('ARTICULO','SALDO','SOBRANTE') AND s.id_ultimo_orden_trabajo_cierre IS NOT NULL)) AND ((s.estado='CONFIRMAR_PESO' AND scale.id IS NULL) OR (ot.fecha_fin_ejecucion IS NOT NULL AND warehouse.id_equipo=ot.id_equipo)) AND ot.eliminado=0" "838"
  expect_value foreign_key_orphans "SELECT COUNT(*) FROM information_schema.referential_constraints rc WHERE rc.constraint_schema='$TEST_DB_NAME' AND NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema=rc.unique_constraint_schema AND t.table_name=rc.referenced_table_name)" "0"
  expect_value a02_work_order_orphans "SELECT COUNT(*) FROM test_database.flujo_materiales_detalles f LEFT JOIN test_database.ordenes_trabajo ot ON ot.id=f.id_orden_trabajo WHERE f.id_orden_trabajo IS NOT NULL AND ot.id IS NULL" "0"
  expect_value a02_material_orphans "SELECT COUNT(*) FROM test_database.flujo_materiales_detalles f LEFT JOIN test_database.orden_trabajo_materiales m ON m.id=f.id_orden_trabajo_material WHERE f.id_orden_trabajo_material IS NOT NULL AND m.id IS NULL" "0"
  expect_value a03_consumption_work_order_orphans "SELECT COUNT(*) FROM test_database.orden_trabajo_materiales m LEFT JOIN test_database.ordenes_trabajo ot ON ot.id=m.id_orden_trabajo WHERE m.id_orden_trabajo IS NOT NULL AND ot.id IS NULL" "0"
  expect_value a05_scale_serial_orphans "SELECT COUNT(*) FROM test_database.balanza_carga_detalle_registros b LEFT JOIN test_database.articulo_serial s ON s.id=b.id_articulo_serial WHERE b.id_articulo_serial IS NOT NULL AND s.id IS NULL" "0"
  expect_value a05_warehouse_orphans "SELECT COUNT(*) FROM test_database.articulo_serial s LEFT JOIN test_database.almacenes a ON a.id=s.id_almacen WHERE s.id_almacen IS NOT NULL AND a.id IS NULL" "0"

  mysql_in_container writer --database="$TEST_DB_NAME" <<'SQL'
START TRANSACTION;
INSERT INTO `_prisma_migrations` (`id`,`checksum`,`migration_name`,`started_at`,`applied_steps_count`) VALUES ('monitor-test-writer-proof','monitor-test-writer-proof','monitor-test-writer-proof',CURRENT_TIMESTAMP(3),0);
UPDATE `_prisma_migrations` SET `checksum`='monitor-test-writer-proof-updated' WHERE `id`='monitor-test-writer-proof';
DELETE FROM `_prisma_migrations` WHERE `id`='monitor-test-writer-proof';
ROLLBACK;
SQL
  echo "writer_dml_rollback=passed" >> "$report"

  mysql_query monitor "SELECT COUNT(*) FROM $TEST_DB_NAME._prisma_migrations" >/dev/null
  probe_table="_monitor_privilege_probe"
  mysql_query reset "DROP TABLE IF EXISTS $TEST_DB_NAME.$probe_table; CREATE TABLE $TEST_DB_NAME.$probe_table (id INT PRIMARY KEY);"
  cleanup_probe() { mysql_query reset "DROP TABLE IF EXISTS $TEST_DB_NAME.$probe_table" >/dev/null 2>&1 || true; }
  trap cleanup_probe EXIT INT TERM
  denied=0
  while IFS= read -r statement; do
    error_file="$test_db_evidence/monitor-denial-$timestamp-$denied.txt"
    if mysql_query monitor "$statement" > /dev/null 2> "$error_file"; then
      die "Monitor operation unexpectedly succeeded: $statement"
    fi
    grep -Eq 'ERROR (1044|1142|1143|1227).*denied|ERROR 1227.*privilege' "$error_file" || die "Monitor failure was not an access-denied error: $statement"
    denied=$((denied + 1))
  done <<'SQL'
INSERT INTO test_database._prisma_migrations (id,checksum,migration_name,started_at,applied_steps_count) VALUES ('monitor-denied','x','x',CURRENT_TIMESTAMP(3),0)
UPDATE test_database._prisma_migrations SET checksum=checksum WHERE 1=0
DELETE FROM test_database._prisma_migrations WHERE 1=0
CREATE TABLE test_database.monitor_denied (id INT PRIMARY KEY)
ALTER TABLE test_database._monitor_privilege_probe ADD COLUMN denied INT NULL
DROP TABLE test_database._monitor_privilege_probe
SET GLOBAL sql_mode=''
CREATE USER 'monitor_denied_unique_probe'@'%' IDENTIFIED BY 'monitor-denied'
GRANT SELECT ON test_database.* TO 'monitor_denied_unique_probe'@'%'
SQL
  cleanup_probe
  trap - EXIT INT TERM
  echo "monitor_access_denials=$denied" >> "$report"

  mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names --execute="SELECT CONCAT('CHECKSUM TABLE ', table_name, ';') FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name" |
    mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names > "$test_db_evidence/table-checksums-$timestamp.tsv"
  checksum_digest="$(shasum -a 256 "$test_db_evidence/table-checksums-$timestamp.tsv" | awk '{print $1}')"
  [[ "$checksum_digest" == "$TEST_DB_TABLE_CHECKSUM_DIGEST" ]] || die "table checksum digest differs from the verified baseline"
  echo "table_checksum_digest=$checksum_digest" >> "$report"
fi

cp "$report" "$latest"
echo "Validation passed ($mode): $latest"
