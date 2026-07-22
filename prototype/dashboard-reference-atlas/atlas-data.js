window.ATLAS_DATA = {
  "id": "monitor-dashboard-references",
  "title": "Dashboard inspiration review",
  "rounds": [
    {
      "id": "round-1",
      "label": "Round 1 · Compact filtering and operational analysis",
      "references": [
        {
          "id": "mixpanel-compact-analysis",
          "title": "Compact analysis workspace",
          "product": "Mixpanel · Insights",
          "sourceUrl": "https://mobbin.com/screens/e78f1ffb-654f-40b4-963b-cb18e68ca360",
          "image": "images/mixpanel-compact.jpg",
          "rationale": "A shallow date-and-comparison control row sits directly above the chart, while the detailed values remain immediately below it. Review the filter density, chart controls, and chart-to-table relationship separately.",
          "regions": [
            { "id": "primary-navigation", "label": "Primary navigation", "x": 0, "y": 0, "width": 15, "height": 91 },
            { "id": "report-header", "label": "Report header and actions", "x": 15, "y": 0, "width": 85, "height": 13 },
            { "id": "compact-filter-row", "label": "Compact date and comparison filters", "x": 18, "y": 14, "width": 58, "height": 10 },
            { "id": "trend-chart", "label": "Trend chart", "x": 18, "y": 24, "width": 59, "height": 34 },
            { "id": "results-table", "label": "Results table", "x": 18, "y": 59, "width": 59, "height": 30 },
            { "id": "metric-configuration", "label": "Metric configuration panel", "x": 78, "y": 9, "width": 22, "height": 80 }
          ]
        },
        {
          "id": "amplitude-segmentation",
          "title": "Chart with structured segmentation",
          "product": "Amplitude · Segmentation",
          "sourceUrl": "https://mobbin.com/screens/cb1a7915-7368-4106-be5f-1361cf58723a",
          "image": "images/amplitude-segmentation.jpg",
          "rationale": "The chart stays visually quiet while event and grouping logic live in a dedicated side panel. The chart header keeps period, granularity, and display controls compact, and the table mirrors the plotted data.",
          "regions": [
            { "id": "global-navigation", "label": "Global navigation", "x": 0, "y": 0, "width": 100, "height": 13 },
            { "id": "query-builder", "label": "Event and segmentation builder", "x": 1, "y": 19, "width": 27, "height": 67 },
            { "id": "chart-controls", "label": "Chart controls", "x": 30, "y": 17, "width": 68, "height": 8 },
            { "id": "segmentation-chart", "label": "Segmentation chart", "x": 30, "y": 25, "width": 68, "height": 42 },
            { "id": "breakdown-table", "label": "Breakdown table", "x": 30, "y": 68, "width": 68, "height": 18 }
          ]
        },
        {
          "id": "better-stack-reporting",
          "title": "Incident operations and reporting",
          "product": "Better Stack · Reporting",
          "screens": [
            {
              "id": "incident-weekly-overview",
              "label": "Incident overview and weekly trend",
              "sourceUrl": "https://mobbin.com/screens/d3f585e4-282b-4bc7-8b56-9f9c915f7123",
              "image": "images/better-stack-weekly.jpg",
              "regions": [
                { "id": "primary-navigation", "label": "Primary navigation", "x": 0, "y": 0, "width": 15, "height": 91 },
                { "id": "incident-summary", "label": "Current incident summary", "x": 22, "y": 6, "width": 70, "height": 14 },
                { "id": "weekly-incident-chart", "label": "Incidents by week chart", "x": 22, "y": 22, "width": 70, "height": 49 }
              ]
            },
            {
              "id": "incident-list",
              "label": "Incident list and search",
              "sourceUrl": "https://mobbin.com/screens/2cf819e3-6067-4972-bb02-9379c9f0b7fc",
              "image": "images/better-stack-incidents.jpg",
              "regions": [
                { "id": "primary-navigation", "label": "Primary navigation", "x": 0, "y": 0, "width": 18, "height": 91 },
                { "id": "search-and-report", "label": "Search and report action", "x": 62, "y": 7, "width": 30, "height": 7 },
                { "id": "incident-list", "label": "Incident list", "x": 26, "y": 20, "width": 66, "height": 15 },
                { "id": "onboarding-checklist", "label": "Setup checklist", "x": 26, "y": 41, "width": 66, "height": 47 }
              ]
            },
            {
              "id": "reporting-empty",
              "label": "Reporting filters and empty state",
              "sourceUrl": "https://mobbin.com/screens/b06f4a90-1c59-4ec7-a9ff-11290860e8a4",
              "image": "images/better-stack-reporting-empty.jpg",
              "regions": [
                { "id": "primary-navigation", "label": "Primary navigation", "x": 0, "y": 0, "width": 18, "height": 91 },
                { "id": "report-navigation", "label": "Reporting navigation", "x": 18, "y": 0, "width": 14, "height": 91 },
                { "id": "filter-chips", "label": "Compact report filters", "x": 34, "y": 14, "width": 59, "height": 13 },
                { "id": "empty-trend-chart", "label": "Empty trend chart", "x": 34, "y": 31, "width": 63, "height": 31 },
                { "id": "metric-strip", "label": "Incident metric strip", "x": 34, "y": 62, "width": 63, "height": 10 },
                { "id": "incident-table", "label": "Incident table", "x": 34, "y": 77, "width": 63, "height": 12 }
              ]
            },
            {
              "id": "reporting-populated",
              "label": "Reporting trend, metrics, and table",
              "sourceUrl": "https://mobbin.com/screens/048b668e-8dd3-4b49-9b9e-72835fa7d261",
              "image": "images/better-stack-reporting.jpg",
              "regions": [
                { "id": "primary-navigation", "label": "Primary navigation", "x": 0, "y": 0, "width": 18, "height": 91 },
                { "id": "report-navigation", "label": "Reporting navigation", "x": 18, "y": 0, "width": 14, "height": 91 },
                { "id": "filter-chips", "label": "Compact report filters", "x": 34, "y": 14, "width": 59, "height": 13 },
                { "id": "incident-trend-chart", "label": "Incident trend chart", "x": 34, "y": 31, "width": 63, "height": 31 },
                { "id": "metric-strip", "label": "Incident metric strip", "x": 34, "y": 62, "width": 63, "height": 10 },
                { "id": "incident-table", "label": "Incident table", "x": 34, "y": 77, "width": 63, "height": 13 }
              ]
            }
          ],
          "rationale": "This set is closest to Monitor's incident domain. Use the arrows to compare its incident list, weekly trend, compact report filters, status metrics, and dense incident table. Judge the information architecture independently from its dark theme and large side navigation."
        },
        {
          "id": "kajabi-pageviews",
          "title": "Quiet report with isolated filters",
          "product": "Kajabi · Page views",
          "sourceUrl": "https://mobbin.com/screens/51f494cc-b9db-4366-b2d9-5ee970a7c7b8",
          "image": "images/kajabi-pageviews.jpg",
          "rationale": "A minimalist chart canvas keeps the date and granularity controls on one line and isolates secondary filters in a narrow right rail. It tests whether Monitor should hide filter complexity away from the main report surface.",
          "regions": [
            { "id": "primary-navigation", "label": "Primary navigation", "x": 0, "y": 0, "width": 15, "height": 91 },
            { "id": "report-header", "label": "Report header and date controls", "x": 17, "y": 7, "width": 65, "height": 15 },
            { "id": "filter-rail", "label": "Filter rail", "x": 84, "y": 0, "width": 16, "height": 91 },
            { "id": "page-view-trend", "label": "Page views trend", "x": 17, "y": 22, "width": 65, "height": 39 },
            { "id": "breakdown-cards", "label": "Breakdown charts", "x": 17, "y": 64, "width": 65, "height": 27 }
          ]
        },
        {
          "id": "fibery-report-builder",
          "title": "Composable operational report",
          "product": "Fibery · Report builder",
          "sourceUrl": "https://mobbin.com/screens/6e0b22b0-ec0e-4153-8cb3-93624f0812e9",
          "image": "images/fibery-report-builder.jpg",
          "rationale": "The report exposes a single compact filter entry point and lets users add chart, table, or KPI views. It may inspire flexible dimension switching, although its editing controls may be too complex for ordinary Monitor users.",
          "regions": [
            { "id": "primary-navigation", "label": "Primary navigation", "x": 0, "y": 0, "width": 18, "height": 91 },
            { "id": "data-source-panel", "label": "Data source and fields", "x": 18, "y": 13, "width": 26, "height": 78 },
            { "id": "view-controls", "label": "View controls", "x": 45, "y": 13, "width": 36, "height": 11 },
            { "id": "operational-chart", "label": "Operational chart", "x": 47, "y": 24, "width": 34, "height": 66 },
            { "id": "chart-settings", "label": "Chart settings", "x": 83, "y": 13, "width": 15, "height": 77 }
          ]
        },
        {
          "id": "zendesk-ticket-report",
          "title": "Status report with removable filters",
          "product": "Zendesk · Ticket reporting",
          "sourceUrl": "https://mobbin.com/screens/0266f390-4260-435f-bab8-95d2243a6ed1",
          "image": "images/zendesk-ticket-report.jpg",
          "rationale": "Active filters appear as small removable chips immediately above the chart, making the current drill-down state visible without a tall filter panel. The screen also demonstrates stacked status data, but much of the surrounding UI is report-authoring machinery.",
          "regions": [
            { "id": "product-navigation", "label": "Product navigation", "x": 0, "y": 0, "width": 4, "height": 91 },
            { "id": "measures-and-dimensions", "label": "Measures and dimensions", "x": 4, "y": 8, "width": 19, "height": 83 },
            { "id": "report-actions", "label": "Report actions", "x": 24, "y": 0, "width": 72, "height": 13 },
            { "id": "active-filter-chips", "label": "Active removable filters", "x": 24, "y": 13, "width": 43, "height": 8 },
            { "id": "status-chart", "label": "Status chart", "x": 25, "y": 21, "width": 42, "height": 59 },
            { "id": "chart-settings", "label": "Chart settings panel", "x": 67, "y": 16, "width": 29, "height": 66 }
          ]
        }
      ]
    }
  ]
};
