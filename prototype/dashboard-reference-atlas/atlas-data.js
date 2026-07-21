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
          "regions": []
        },
        {
          "id": "amplitude-segmentation",
          "title": "Chart with structured segmentation",
          "product": "Amplitude · Segmentation",
          "sourceUrl": "https://mobbin.com/screens/cb1a7915-7368-4106-be5f-1361cf58723a",
          "image": "images/amplitude-segmentation.jpg",
          "rationale": "The chart stays visually quiet while event and grouping logic live in a dedicated side panel. The chart header keeps period, granularity, and display controls compact, and the table mirrors the plotted data.",
          "regions": []
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
              "regions": []
            },
            {
              "id": "incident-list",
              "label": "Incident list and search",
              "sourceUrl": "https://mobbin.com/screens/2cf819e3-6067-4972-bb02-9379c9f0b7fc",
              "image": "images/better-stack-incidents.jpg",
              "regions": []
            },
            {
              "id": "reporting-empty",
              "label": "Reporting filters and empty state",
              "sourceUrl": "https://mobbin.com/screens/b06f4a90-1c59-4ec7-a9ff-11290860e8a4",
              "image": "images/better-stack-reporting-empty.jpg",
              "regions": []
            },
            {
              "id": "reporting-populated",
              "label": "Reporting trend, metrics, and table",
              "sourceUrl": "https://mobbin.com/screens/048b668e-8dd3-4b49-9b9e-72835fa7d261",
              "image": "images/better-stack-reporting.jpg",
              "regions": []
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
          "regions": []
        },
        {
          "id": "fibery-report-builder",
          "title": "Composable operational report",
          "product": "Fibery · Report builder",
          "sourceUrl": "https://mobbin.com/screens/6e0b22b0-ec0e-4153-8cb3-93624f0812e9",
          "image": "images/fibery-report-builder.jpg",
          "rationale": "The report exposes a single compact filter entry point and lets users add chart, table, or KPI views. It may inspire flexible dimension switching, although its editing controls may be too complex for ordinary Monitor users.",
          "regions": []
        },
        {
          "id": "zendesk-ticket-report",
          "title": "Status report with removable filters",
          "product": "Zendesk · Ticket reporting",
          "sourceUrl": "https://mobbin.com/screens/0266f390-4260-435f-bab8-95d2243a6ed1",
          "image": "images/zendesk-ticket-report.jpg",
          "rationale": "Active filters appear as small removable chips immediately above the chart, making the current drill-down state visible without a tall filter panel. The screen also demonstrates stacked status data, but much of the surrounding UI is report-authoring machinery.",
          "regions": []
        }
      ]
    }
  ]
};
