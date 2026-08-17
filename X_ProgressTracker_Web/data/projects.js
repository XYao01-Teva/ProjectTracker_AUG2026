/**
 * Template project data. Replace/extend these entries as real project
 * information becomes available — owner fields are intentionally "TBD".
 *
 * Fields:
 *   id          unique string
 *   name        project name
 *   category    strategic area (see STRATEGIC_AREAS below)
 *   owner       person/team responsible (TBD placeholder)
 *   status      "Not Started" | "In Progress" | "At Risk" | "Blocked" | "Complete"
 *   start       ISO date string (YYYY-MM-DD)
 *   end         ISO date string (YYYY-MM-DD)
 *   description short one-line summary
 */
window.STRATEGIC_AREAS = [
  "Robotics",
  "Automation",
  "Process Monitoring and Control",
  "AI Tools",
  "Connectivity",
  "Data Collection and Analytics",
  "Predictive Models",
  "Control Centers",
  "AR",
  "RFID"
];

window.PROJECTS = [
  {
    id: "proj-01",
    name: "Autonomous Mobile Robot Pilot",
    category: "Robotics",
    owner: "TBD",
    status: "In Progress",
    start: "2026-04-01",
    end: "2026-10-15",
    description: "Pilot AMRs for material movement on the production floor."
  },
  {
    id: "proj-02",
    name: "Packaging Line Automation Upgrade",
    category: "Automation",
    owner: "TBD",
    status: "At Risk",
    start: "2026-05-01",
    end: "2026-08-05",
    description: "Automate manual steps on the secondary packaging line."
  },
  {
    id: "proj-03",
    name: "Real-Time Process Monitoring Rollout",
    category: "Process Monitoring and Control",
    owner: "TBD",
    status: "Not Started",
    start: "2026-09-01",
    end: "2027-01-15",
    description: "Deploy live process monitoring and control across key lines."
  },
  {
    id: "proj-04",
    name: "AI Quality Inspection Assistant",
    category: "AI Tools",
    owner: "TBD",
    status: "In Progress",
    start: "2026-06-01",
    end: "2026-11-30",
    description: "AI-assisted visual inspection tool for quality checks."
  },
  {
    id: "proj-05",
    name: "Plant-Wide Connectivity Upgrade",
    category: "Connectivity",
    owner: "TBD",
    status: "Blocked",
    start: "2026-03-01",
    end: "2026-09-20",
    description: "Expand reliable network coverage across the facility."
  },
  {
    id: "proj-06",
    name: "Shop Floor Data Collection Platform",
    category: "Data Collection and Analytics",
    owner: "TBD",
    status: "Complete",
    start: "2026-01-05",
    end: "2026-05-20",
    description: "Centralize machine and sensor data collection for analytics."
  },
  {
    id: "proj-07",
    name: "Predictive Maintenance Model Rollout",
    category: "Predictive Models",
    owner: "TBD",
    status: "In Progress",
    start: "2026-07-01",
    end: "2026-12-15",
    description: "Deploy predictive models to flag equipment failures early."
  },
  {
    id: "proj-08",
    name: "Central Operations Control Center",
    category: "Control Centers",
    owner: "TBD",
    status: "Not Started",
    start: "2026-10-01",
    end: "2027-02-28",
    description: "Stand up a centralized control center for site operations."
  },
  {
    id: "proj-09",
    name: "AR-Guided Maintenance Trial",
    category: "AR",
    owner: "TBD",
    status: "Not Started",
    start: "2026-11-01",
    end: "2027-03-10",
    description: "Trial AR headsets for guided equipment maintenance."
  },
  {
    id: "proj-10",
    name: "RFID Inventory Tracking Rollout",
    category: "RFID",
    owner: "TBD",
    status: "In Progress",
    start: "2026-02-16",
    end: "2026-09-01",
    description: "Tag and track inventory and assets using RFID."
  }
];
