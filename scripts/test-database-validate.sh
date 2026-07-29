#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/test-database-common.sh"

mode="${1:-}"
require_safe_target
require_docker_context
require_protected_dump
mkdir -p "$test_db_evidence"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
report="$test_db_evidence/validation-$timestamp.txt"
latest="$test_db_evidence/latest-validation.txt"

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

: > "$report"
echo "validated_at=$timestamp" >> "$report"
echo "dump_sha256=$TEST_DB_DUMP_SHA256" >> "$report"
expect_value version "SELECT VERSION()" "8.0.43"
expect_value tables "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' AND table_type='BASE TABLE'" "378"
expect_value views "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='$TEST_DB_NAME'" "111"
expect_value charset "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='$TEST_DB_NAME'" "utf8mb4"
expect_value collation "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='$TEST_DB_NAME'" "utf8mb4_0900_ai_ci"
expect_value lower_case_table_names "SELECT @@lower_case_table_names" "0"
expect_value transaction_isolation "SELECT @@global.transaction_isolation" "REPEATABLE-READ"
expect_value global_sql_mode "SELECT @@global.sql_mode" ""
expect_value global_time_zone "SELECT @@global.time_zone" "+00:00"
expect_value system_time_zone "SELECT @@system_time_zone" "UTC"
expect_value triggers "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$TEST_DB_NAME'" "0"
expect_value routines "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='$TEST_DB_NAME'" "0"
expect_value events "SELECT COUNT(*) FROM information_schema.events WHERE event_schema='$TEST_DB_NAME'" "0"

mysql_query reset "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$TEST_DB_NAME'" | awk '{print "columns=" $1}' >> "$report"
mysql_query reset "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema='$TEST_DB_NAME'" | awk '{print "index_columns=" $1}' >> "$report"
mysql_query reset "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema='$TEST_DB_NAME'" | awk '{print "constraints=" $1}' >> "$report"
mysql_query reset "SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema='$TEST_DB_NAME'" | awk '{print "foreign_keys=" $1}' >> "$report"
mysql_query reset "SELECT table_collation, COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' AND table_type='BASE TABLE' GROUP BY table_collation ORDER BY table_collation" | sed 's/^/table_collation=/' >> "$report"

for table_name in flujo_materiales_detalles ordenes_trabajo orden_trabajo_materiales articulo_serial balanza_carga_detalle_registros almacenes; do
  mysql_query reset "SELECT COUNT(*) FROM \`$TEST_DB_NAME\`.\`$table_name\`" | awk -v table="$table_name" '{print "source_rows." table "=" $1}' >> "$report"
done

expect_value a02_candidate_rows "SELECT COUNT(*) FROM test_database.flujo_materiales_detalles f JOIN test_database.ordenes_trabajo ot ON ot.id=f.id_orden_trabajo WHERE f.estado='TRANSITO' AND f.fecha_recepcion IS NULL AND f.fecha_eliminacion IS NULL AND f.id_orden_trabajo IS NOT NULL AND f.id_orden_trabajo_material IS NOT NULL AND ot.eliminado=0" "1249"
expect_value a05_candidate_rows "SELECT COUNT(DISTINCT s.id) FROM test_database.articulo_serial s JOIN test_database.ordenes_trabajo ot ON ot.id=COALESCE(s.id_orden_trabajo_origen,s.id_ultimo_orden_trabajo_cierre) LEFT JOIN test_database.balanza_carga_detalle_registros scale ON scale.id_articulo_serial=s.id AND scale.eliminado=0 LEFT JOIN test_database.almacenes warehouse ON warehouse.id=s.id_almacen WHERE s.fecha_eliminacion IS NULL AND s.estado IN ('CONFIRMAR_PESO','DISPONIBLE') AND ((s.tipo='PRODUCTO_EN_PROCESO' AND s.id_orden_trabajo_origen IS NOT NULL) OR (s.tipo IN ('ARTICULO','SALDO','SOBRANTE') AND s.id_ultimo_orden_trabajo_cierre IS NOT NULL)) AND ((s.estado='CONFIRMAR_PESO' AND scale.id IS NULL) OR (ot.fecha_fin_ejecucion IS NOT NULL AND warehouse.id_equipo=ot.id_equipo)) AND ot.eliminado=0" "838"

# Referential integrity and view usability.
expect_value foreign_key_orphans "SELECT COUNT(*) FROM information_schema.referential_constraints rc WHERE rc.constraint_schema='$TEST_DB_NAME' AND NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema=rc.unique_constraint_schema AND t.table_name=rc.referenced_table_name)" "0"
expect_value a02_work_order_orphans "SELECT COUNT(*) FROM test_database.flujo_materiales_detalles f LEFT JOIN test_database.ordenes_trabajo ot ON ot.id=f.id_orden_trabajo WHERE f.id_orden_trabajo IS NOT NULL AND ot.id IS NULL" "0"
expect_value a02_material_orphans "SELECT COUNT(*) FROM test_database.flujo_materiales_detalles f LEFT JOIN test_database.orden_trabajo_materiales m ON m.id=f.id_orden_trabajo_material WHERE f.id_orden_trabajo_material IS NOT NULL AND m.id IS NULL" "0"
expect_value a03_consumption_work_order_orphans "SELECT COUNT(*) FROM test_database.orden_trabajo_materiales m LEFT JOIN test_database.ordenes_trabajo ot ON ot.id=m.id_orden_trabajo WHERE m.id_orden_trabajo IS NOT NULL AND ot.id IS NULL" "0"
expect_value a05_scale_serial_orphans "SELECT COUNT(*) FROM test_database.balanza_carga_detalle_registros b LEFT JOIN test_database.articulo_serial s ON s.id=b.id_articulo_serial WHERE b.id_articulo_serial IS NOT NULL AND s.id IS NULL" "0"
expect_value a05_warehouse_orphans "SELECT COUNT(*) FROM test_database.articulo_serial s LEFT JOIN test_database.almacenes a ON a.id=s.id_almacen WHERE s.id_almacen IS NOT NULL AND a.id IS NULL" "0"
view_check_output="$(mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names --execute="SELECT CONCAT('CHECK TABLE ', table_name, ';') FROM information_schema.views WHERE table_schema=DATABASE() ORDER BY table_name" | mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names)"
view_errors="$(printf '%s\n' "$view_check_output" | awk '$3 == "Error" {count++} END {print count+0}')"
view_warnings="$(printf '%s\n' "$view_check_output" | awk '$3 == "Warning" {count++} END {print count+0}')"
[[ "$view_errors" == "0" ]] || die "$view_errors views failed CHECK TABLE"
echo "view_check_errors=0" >> "$report"
echo "view_check_warnings=$view_warnings" >> "$report"

# Deterministic table-level checksums and metadata digest. No row values are emitted.
mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names --execute="SELECT CONCAT('CHECKSUM TABLE ', table_name, ';') FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name" |
  mysql_in_container reset --database="$TEST_DB_NAME" --batch --skip-column-names > "$test_db_evidence/table-checksums-$timestamp.tsv"
checksum_digest="$(shasum -a 256 "$test_db_evidence/table-checksums-$timestamp.tsv" | awk '{print $1}')"
[[ "$checksum_digest" == "$TEST_DB_TABLE_CHECKSUM_DIGEST" ]] || die "table checksum digest differs from the verified baseline"
echo "table_checksum_digest=$checksum_digest" >> "$report"

metadata_file="$test_db_evidence/schema-metadata-$timestamp.tsv"
: > "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'TABLE',table_name,engine,row_format,table_collation,create_options FROM information_schema.tables WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'COLUMN',table_name,column_name,ordinal_position,column_type,is_nullable,IFNULL(column_default,'<NULL>'),extra,IFNULL(character_set_name,'<NULL>'),IFNULL(collation_name,'<NULL>'),IFNULL(generation_expression,'') FROM information_schema.columns WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,ordinal_position" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'INDEX',table_name,index_name,non_unique,seq_in_index,IFNULL(column_name,'<EXPRESSION>'),IFNULL(collation,''),IFNULL(sub_part,''),nullable,index_type,IFNULL(expression,'') FROM information_schema.statistics WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,index_name,seq_in_index" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'CONSTRAINT',table_name,constraint_name,constraint_type FROM information_schema.table_constraints WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,constraint_name" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'KEY',table_name,constraint_name,ordinal_position,column_name,IFNULL(referenced_table_name,''),IFNULL(referenced_column_name,'') FROM information_schema.key_column_usage WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name,constraint_name,ordinal_position" >> "$metadata_file"
mysql_in_container reset --batch --raw --skip-column-names --execute="SELECT 'VIEW',table_name,check_option,is_updatable,security_type,character_set_client,collation_connection,view_definition FROM information_schema.views WHERE table_schema='$TEST_DB_NAME' ORDER BY table_name" >> "$metadata_file"
metadata_digest="$(shasum -a 256 "$metadata_file" | awk '{print $1}')"
[[ "$metadata_digest" == "$TEST_DB_SCHEMA_METADATA_DIGEST" ]] || die "schema metadata digest differs from the verified baseline"
echo "schema_metadata_digest=$metadata_digest" >> "$report"

# Positive writer proof rolls back; negative Monitor proofs must all fail.
mysql_in_container writer --database="$TEST_DB_NAME" <<'SQL'
START TRANSACTION;
INSERT INTO `_prisma_migrations` (`id`,`checksum`,`migration_name`,`started_at`,`applied_steps_count`) VALUES ('monitor-test-writer-proof','monitor-test-writer-proof','monitor-test-writer-proof',CURRENT_TIMESTAMP(3),0);
UPDATE `_prisma_migrations` SET `checksum`='monitor-test-writer-proof-updated' WHERE `id`='monitor-test-writer-proof';
DELETE FROM `_prisma_migrations` WHERE `id`='monitor-test-writer-proof';
ROLLBACK;
SQL
echo "writer_dml_rollback=passed" >> "$report"

mysql_query monitor "SELECT COUNT(*) FROM $TEST_DB_NAME._prisma_migrations" >/dev/null
echo "monitor_select=passed" >> "$report"
expect_root_value monitor_schema_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.schema_privileges WHERE grantee=\"'monitor_source_ro'@'%'\" AND table_schema='$TEST_DB_NAME'" "SELECT,SHOW VIEW"
expect_root_value writer_schema_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.schema_privileges WHERE grantee=\"'alertas_fake'@'%'\" AND table_schema='$TEST_DB_NAME'" "DELETE,INSERT,SELECT,UPDATE"
expect_root_value reset_schema_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.schema_privileges WHERE grantee=\"'test_database_admin'@'%'\" AND table_schema='$TEST_DB_NAME'" "ALTER,CREATE,CREATE VIEW,DELETE,DROP,INDEX,INSERT,LOCK TABLES,REFERENCES,SELECT,SHOW VIEW,UPDATE"
expect_root_value monitor_global_grants "SELECT GROUP_CONCAT(privilege_type ORDER BY privilege_type SEPARATOR ',') FROM information_schema.user_privileges WHERE grantee=\"'monitor_source_ro'@'%'\"" "USAGE"

mysql_query reset "CREATE TABLE $TEST_DB_NAME._monitor_privilege_probe (id INT PRIMARY KEY)"
negative_count=0
unexpected_count=0
while IFS= read -r statement; do
  if mysql_query monitor "$statement" >/dev/null 2>&1; then
    unexpected_count=$((unexpected_count + 1))
  fi
  negative_count=$((negative_count + 1))
done <<'SQL'
INSERT INTO test_database._prisma_migrations (id,checksum,migration_name,started_at,applied_steps_count) VALUES ('monitor-denied','x','x',CURRENT_TIMESTAMP(3),0)
UPDATE test_database._prisma_migrations SET checksum=checksum WHERE 1=0
DELETE FROM test_database._prisma_migrations WHERE 1=0
CREATE TABLE test_database.monitor_denied (id INT PRIMARY KEY)
ALTER TABLE test_database._monitor_privilege_probe ADD COLUMN denied INT NULL
DROP TABLE test_database._monitor_privilege_probe
SET GLOBAL sql_mode=''
CREATE USER 'monitor_denied'@'%' IDENTIFIED BY 'monitor-denied'
GRANT SELECT ON test_database.* TO 'monitor_denied'@'%'
SQL
mysql_query reset "DROP TABLE IF EXISTS $TEST_DB_NAME._monitor_privilege_probe"
[[ "$unexpected_count" == "0" ]] || die "$unexpected_count Monitor denial operations unexpectedly succeeded"
echo "monitor_denied_operations=$negative_count" >> "$report"

cp "$report" "$latest"
if [[ "$mode" == "--write-baseline" ]]; then
  cp "$report" "$test_db_evidence/baseline-validation.txt"
  cp "$test_db_evidence/table-checksums-$timestamp.tsv" "$test_db_evidence/baseline-table-checksums.tsv"
  cp "$metadata_file" "$test_db_evidence/baseline-schema-metadata.tsv"
elif [[ -f "$test_db_evidence/baseline-table-checksums.tsv" ]]; then
  cmp -s "$test_db_evidence/baseline-table-checksums.tsv" "$test_db_evidence/table-checksums-$timestamp.tsv" || die "table checksums differ from baseline"
  cmp -s "$test_db_evidence/baseline-schema-metadata.tsv" "$metadata_file" || die "schema metadata differs from baseline"
  echo "baseline_checksum_match=passed" >> "$latest"
  echo "baseline_schema_match=passed" >> "$latest"
fi

echo "Validation passed; local evidence: $latest"
