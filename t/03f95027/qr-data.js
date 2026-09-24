/*
  qr-data.js
  OpsBagV2 — QR & LINKS (web build)

  Author: Peter Lee
  Email: peterlee@evaair.com
  Date: 2026-09-24

  工具內容資料，與原生版本（Views/Tools/ToolsReference.swift、ToolsChecklists.swift、
  Views/Screens/LinksScreen.swift）逐筆對應。修改資料請同時更新兩邊。
  Tool content, kept row-for-row identical to the native sources
  (Views/Tools/ToolsReference.swift, ToolsChecklists.swift and
  Views/Screens/LinksScreen.swift). Any change here must be made in both.
*/

var QRData = (function () {
  'use strict';

  /* ---- FEET AND METER CONVERSION TABLE ----
     南向 180°–359°T、北向 000°–179°T；rvsm 標示 FL291–FL411 的 RVSM 高度帶。
     South = 180°–359°T, north = 000°–179°T; `rvsm` marks the FL291–FL411 band. */
  var ftMeterRows = [
    { southM: 14300, southFt: 46900, northM: 13700, northFt: 44900, rvsm: false },
    { southM: 13100, southFt: 43000, northM: 12500, northFt: 41100, rvsm: false },
    { southM: 12200, southFt: 40100, northM: 11900, northFt: 39100, rvsm: true },
    { southM: 11600, southFt: 38100, northM: 11300, northFt: 37100, rvsm: true },
    { southM: 11000, southFt: 36100, northM: 10700, northFt: 35100, rvsm: true },
    { southM: 10400, southFt: 34100, northM: 10100, northFt: 33100, rvsm: true },
    { southM: 9800, southFt: 32100, northM: 9500, northFt: 31100, rvsm: true },
    { southM: 9200, southFt: 30100, northM: 8900, northFt: 29100, rvsm: true },
    { southM: 8400, southFt: 27600, northM: 8100, northFt: 26600, rvsm: false },
    { southM: 7800, southFt: 25600, northM: 7500, northFt: 24600, rvsm: false },
    { southM: 7200, southFt: 23600, northM: 6900, northFt: 22600, rvsm: false },
    { southM: 6600, southFt: 21700, northM: 6300, northFt: 20700, rvsm: false },
    { southM: 6000, southFt: 19700, northM: 5700, northFt: 18700, rvsm: false },
    { southM: 5400, southFt: 17700, northM: 5100, northFt: 16700, rvsm: false },
    { southM: 4800, southFt: 15700, northM: 4500, northFt: 14800, rvsm: false },
    { southM: 4200, southFt: 13800, northM: 3900, northFt: 12800, rvsm: false },
    { southM: 3600, southFt: 11800, northM: 3300, northFt: 10800, rvsm: false },
    { southM: 3000, southFt: 9800, northM: 2700, northFt: 8900, rvsm: false },
    { southM: 2400, southFt: 7900, northM: 2100, northFt: 6900, rvsm: false },
    { southM: 1800, southFt: 5900, northM: 1500, northFt: 4900, rvsm: false },
    { southM: 1200, southFt: 3900, northM: 900, northFt: 3000, rvsm: false },
    { southM: 700, southFt: 2300, northM: 600, northFt: 2000, rvsm: false }
  ];

  /* ---- TEM CARD ---- */
  var temThreats = [
    { name: 'Airport / Runway', color: 'chip-blue',
      items: ['Contamination', 'Construction', 'Congestion', 'Signage', 'Hotspots', 'NOTAM'] },
    { name: 'ATC', color: 'teal',
      items: ['Clearance', 'SID/STAR Amendments', 'Radio Congestion', 'Non-Standards', 'Language Difficulty', 'Similar Callsign'] },
    { name: 'Aircraft', color: 'chip-gold',
      items: ['MELs / CDLs', 'Systems / Equipment', 'Automation', 'Performance', 'Communication'] },
    { name: 'Adverse Weather', color: 'orange',
      items: ['Visibility', 'Winds / Windshear', 'Precipitation', 'Storms', 'Cold Weather OPS', 'Hot Weather OPS'] },
    { name: 'Environment', color: 'chip-green',
      items: ['Terrain', 'Traffic', 'Night', 'Airport Lighting', 'Airfield Elevation'] },
    { name: 'Ground / Ramp', color: 'accent',
      items: ['External Power', 'External Air', 'Handling', 'Tow Truck'] },
    { name: 'Dispatch', color: 'magenta',
      items: ['Slot Time', 'Delays', 'Crew Scheduling', 'Manuals / Charts'] },
    { name: 'Operational', color: 'red',
      items: ['Time Pressure', 'Non-Normal Conditions', 'Unfamiliar Airport', 'Flight Diversion'] },
    { name: 'Physiology', color: 'teal',
      items: ['Fatigue', 'Stress', 'Hydration', 'Nutrition', 'Jetlag'] },
    { name: 'Crew', color: 'chip-blue',
      items: ['Experience', 'Recency', 'First Flight of the Day', 'Route Familiarity'] },
    { name: 'Cabin', color: 'chip-gold',
      items: ['Passengers', 'Events / Distraction', 'Interruptions', 'Cabin Crew'] },
    { name: 'Other', color: 'gray', items: ['Complacency'] }
  ];

  var temErrors = [
    { name: 'Skill-Based', color: 'chip-blue',
      items: ['Application of Procedures', 'Flight Path Management', 'Automation', 'Manual Control'] },
    { name: 'Decision', color: 'chip-gold',
      items: ['Application of Knowledge', 'Problem Solving and Decision Making'] },
    { name: 'Perceptual', color: 'orange', items: ['Workload Management'] },
    { name: 'CRM', color: 'chip-green',
      items: ['Leadership and Teamwork', 'Communication', 'Situation Awareness'] }
  ];

  /* ---- MANAGING RUNWAY CHANGES ---- */
  var runwayChange = {
    progressLabel: 'PROGRESS',
    completionText: 'All Items Complete',
    completionSub: 'Ready for runway change / diversion',
    entries: [
      { number: 1, text: 'NOTAMs' },
      { number: 2, text: 'ATIS' },
      { number: 3, text: 'OPT' },
      { number: 4, text: 'FLAP Setting' },
      { number: 5, text: 'FMC' },
      { number: 6, text: 'MCP / Trim Set' },
      { number: 7, text: 'Briefing' },
      { number: 8, text: 'Checklists' }
    ]
  };

  /* ---- RELIEF CREW HANDOVER BRIEFING ITEMS ---- */
  var handover = {
    progressLabel: 'BRIEFING PROGRESS',
    completionText: 'Handover Complete',
    completionSub: 'All briefing items confirmed',
    entries: [
      { number: 1, text: 'FMA, cruise speed, power settings and trim condition',
        section: 'Flight Parameters' },
      { number: 2, text: 'Specific ATC instructions', detail: 'e.g. assigned Mach No.' },
      { number: 3, text: 'Overview of the location and next waypoint',
        section: 'Navigation & Fuel' },
      { number: 4, text: 'Fuel management and flight plan comparison' },
      { number: 5, text: 'CPDLC COMM status', detail: 'ATC pages review',
        section: 'Communications' },
      { number: 6, text: 'Current ATS communication watch',
        detail: 'Active frequency, monitor 121.5MHz, adequate speaker volume, etc.' },
      { number: 7, text: 'Information about significant traffic',
        section: 'Safety & Awareness' },
      { number: 8, text: 'Nearest suitable or adequate airport' },
      { number: 9, text: 'Latest enroute and destination weather updates' },
      { number: 10, text: 'Overview of any non-normal or emergency operation, including systems status' },
      { number: 11, text: 'Log reporting requirements', section: 'Operations' },
      { number: 12, text: 'Other matters of importance',
        detail: 'Decompression Escape Route, Cabin Status, etc.' }
    ]
  };

  /* ---- HOLDING SPEED ---- */
  var holdingSections = [
    {
      banner: 'TABLE 1 — ICAO 8168',
      bannerSub: 'PANS-OPS',
      groups: [{
        label: 'Applies to:',
        countries: ['Australia', 'Austria', 'Belgium', 'Cambodia', 'China', 'France',
                    'Germany', 'Hong Kong', 'India', 'Indonesia', 'Italy', 'Korea*',
                    'Laos', 'Macau', 'Malaysia', 'Netherlands', 'New Zealand', 'Taiwan',
                    'Thailand', 'UAE', 'UK (excl. London TMA)', 'Vietnam'],
        rows: [
          ["0 – 14,000'", '230 kts'],
          ["14,001 – 20,000'", '240 kts'],
          ["20,001 – 34,000'", '265 kts'],
          ["Above 34,000'", 'M 0.83']
        ]
      }]
    },
    {
      banner: 'TABLE 2 — FAA TERPS',
      bannerSub: null,
      groups: [
        {
          label: 'Group A:',
          countries: ['Canada', 'Japan (DME fix intersection, etc.)', 'Korea (other aerodromes)*', 'USA'],
          rows: [
            ["0 – 6,000'", '200 kts'],
            ["6,001 – 14,000'", '230 kts'],
            ["Above 14,000'", '265 kts']
          ]
        },
        {
          label: 'Group B:',
          countries: ['Japan (overhead Nav aids)', 'Philippines'],
          rows: [
            ["0 – 6,000'", '210 kts'],
            ["6,001 – 14,000'", '220 kts'],
            ["Above 14,000'", '240 kts']
          ]
        }
      ]
    },
    {
      banner: 'SPECIAL',
      bannerSub: null,
      groups: [{
        label: '',
        countries: [],
        rows: [
          ['Myanmar', "210 kts to 14,000'  ·  240 kts above 14,000'"],
          ['Singapore', '230 kts to FL 140  ·  265 kts FL 150 – FL 250'],
          ['UK (London TMA)', '220 kts up to FL 140']
        ]
      }]
    }
  ];

  var holdingNote =
    '* means extra conditions in Jeppesen Manual  ·  Refer Jeppesen ATC section for current information';

  /* ---- Tools ----
     `ref` 為官方參考文件（REFERENCE.pdf 的指定頁，或獨立檔案）。
     `ref` is the tool's official reference document — either a page of
     REFERENCE.pdf or a standalone file. */
  var tools = [
    { id: 'ftMeter', title: 'Feet and Meter Conversion Table', icon: 'ruler',
      ref: { resource: 'REFERENCE', page: 1, title: 'Official Company Reference' } },
    { id: 'temCard', title: 'TEM Card', icon: 'checklist',
      ref: { resource: 'TEM-Card', page: 1, title: 'TEM Card' } },
    { id: 'runwayChanges', title: 'Managing Runway Changes', icon: 'swap',
      ref: { resource: 'REFERENCE', page: 8, title: 'Official Company Reference' } },
    { id: 'handover', title: 'Relief Crew Handover Briefing Items', icon: 'people',
      ref: { resource: 'Relief Crew Handover Briefing Items', page: 1,
             title: 'Relief Crew Handover Briefing Items' } },
    { id: 'holdingSpeed', title: 'Holding Speed', icon: 'gauge',
      ref: { resource: 'REFERENCE', page: 3, title: 'Official Company Reference' } }
  ];

  /* ---- Bundled reference documents ---- */
  var docs = [
    { title: 'Emergency Response Guidance — Dangerous Goods',
      resource: 'Emergency_Response_Drills', icon: 'warning' },
    { title: 'Cockpit-Ground Communication — China Domestic',
      resource: 'China_Cockpit_Ground_Comms', icon: 'antenna' },
    { title: 'EVA Alternate Airport List 2026 Rev.1',
      resource: 'EVA_Alternate_Airport_List', icon: 'arrival' },
    { title: 'EVAFCD / EVAMM Contact Information',
      resource: 'EVAFCD_EVAMM_Contacts', icon: 'phone' },
    { title: 'Fuel Consumption Table',
      resource: 'Fuel_Consumption_Table', icon: 'fuel' }
  ];

  /* ---- Useful links ----
     `internal: true` 為公司內網位址，僅在 App 內（file / 自訂 scheme）顯示，
     對外託管的版本會隱藏，見 qr-host.js。
     `internal: true` marks a company intranet address. Those rows are shown only
     when the page runs inside the app; the hosted copy hides them (qr-host.js). */
  var windyURL =
    'https://embed.windy.com/embed2.html?lat=23.5&lon=125.0&zoom=5&level=surface' +
    '&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now' +
    '&pressure=&type=map&location=coordinates&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1';

  var links = [
    { title: 'EVA Eagle (Flight Crew Website)', url: 'https://www.evaeagle.com' },
    { title: 'MEL UnClose List', url: 'https://fisnet.evaair.com/MEL_II/MELUnclose_List.aspx',
      internal: true },
    { title: 'FlightRadar24', url: 'https://www.flightradar24.com' },
    { title: 'WINDY', url: windyURL, embeddable: true },
    { title: 'FOSTER', url: 'https://foster-efb.weathernews.com/', signIn: true },
    { title: 'Aeronautical Meteorological Service', url: 'https://aoaws.anws.gov.tw' },
    { title: 'ANWS (Air Navigation and Weather Service CAA)', url: 'https://www.anws.gov.tw' },
    { title: 'Aviation Weather Center TAFs & METARs', url: 'https://aviationweather.gov' }
  ];

  return {
    ftMeterRows: ftMeterRows,
    temThreats: temThreats,
    temErrors: temErrors,
    runwayChange: runwayChange,
    handover: handover,
    holdingSections: holdingSections,
    holdingNote: holdingNote,
    tools: tools,
    docs: docs,
    links: links
  };
})();
