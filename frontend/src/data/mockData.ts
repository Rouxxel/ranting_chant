import type { RequestType } from "@/types";

export type Status = "pending" | "in_progress" | "escalated" | "resolved" | "pending_approval" | "pending_review";
export type Urgency = "low" | "medium" | "high";

export interface Tenant {
  id: string;
  name: string;
  unit: string;
  property: string;
}

export interface ConversationMessage {
  id: string;
  role: "ai" | "tenant";
  text: string;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  channel: "email" | "sms";
  recipient: string;
  timestamp: string;
  summary: string;
}

export interface Party {
  id: string;
  name: string;
  role: string;
}

export interface RequestItem {
  id: string;
  type: RequestType;
  description: string;
  tenantId: string;
  tenantName: string;
  property: string;
  urgency: Urgency;
  status: Status;
  createdAt: string;
  createdLabel: string;
  parties: Party[];
  conversation: ConversationMessage[];
  notifications: NotificationEvent[];
}

export const tenants: Tenant[] = [
  { id: "tenant_001", name: "John Carter", unit: "3B", property: "Sunset Apartments" },
  { id: "tenant_002", name: "Maria Lopez", unit: "5A", property: "Sunset Apartments" },
  { id: "tenant_003", name: "David Kim", unit: "12C", property: "Riverbend Residences" },
  { id: "tenant_004", name: "Aisha Patel", unit: "7D", property: "Riverbend Residences" },
  { id: "tenant_005", name: "Liam O'Brien", unit: "2A", property: "Maple Heights" },
  { id: "tenant_006", name: "Sara Nguyen", unit: "9F", property: "Willow Creek Lofts" },
  { id: "tenant_007", name: "Marcus Reed", unit: "4B", property: "Willow Creek Lofts" },
  { id: "tenant_008", name: "Elena Rossi", unit: "6E", property: "Willow Creek Lofts" },
  { id: "tenant_009", name: "Tom Becker", unit: "8C", property: "Sunset Apartments" },
  { id: "tenant_010", name: "Priya Shah", unit: "1A", property: "Poplar Gardens" },
];

export const tenantById = (id: string) => tenants.find((t) => t.id === id)!;

const mkConv = (msgs: Array<[ConversationMessage["role"], string, string]>): ConversationMessage[] =>
  msgs.map(([role, text, timestamp], i) => ({ id: `m${i}`, role, text, timestamp }));

const mkNotif = (items: Array<[NotificationEvent["channel"], string, string, string]>): NotificationEvent[] =>
  items.map(([channel, recipient, timestamp, summary], i) => ({ id: `n${i}`, channel, recipient, timestamp, summary }));

export const requests: RequestItem[] = [
  {
    id: "REQ-1001",
    type: "access_control",
    description: "Tenant lost apartment key, needs replacement.",
    tenantId: "tenant_001",
    tenantName: "John Carter",
    property: "Sunset Apartments",
    urgency: "low",
    status: "pending",
    createdAt: "2026-05-23",
    createdLabel: "Today",
    parties: [
      { id: "p1", name: "John Carter", role: "Tenant" },
      { id: "p2", name: "Sunset Mgmt", role: "Manager" },
    ],
    conversation: mkConv([
      ["ai", "Hello John! I'm Ranting Chant, your property operations assistant. How can I help you today?", "10:02 AM"],
      ["tenant", "I lost my apartment key", "10:03 AM"],
      ["ai", "I'm sorry to hear that. Was the key lost or stolen?", "10:03 AM"],
      ["tenant", "Lost", "10:04 AM"],
      ["ai", "Do you still have access to your apartment?", "10:04 AM"],
    ]),
    notifications: mkNotif([
      ["email", "manager@sunsetapts.com", "10:05 AM", "New key replacement request opened for unit 3B"],
    ]),
  },
  {
    id: "REQ-1002",
    type: "plumbing",
    description: "Leak under kitchen sink, slow drip.",
    tenantId: "tenant_003",
    tenantName: "David Kim",
    property: "Riverbend Residences",
    urgency: "medium",
    status: "in_progress",
    createdAt: "2026-05-23",
    createdLabel: "Today",
    parties: [
      { id: "p1", name: "David Kim", role: "Tenant" },
      { id: "p2", name: "Acme Plumbing", role: "Vendor" },
    ],
    conversation: mkConv([
      ["ai", "Hi David, what's going on?", "9:10 AM"],
      ["tenant", "Leak under kitchen sink", "9:11 AM"],
      ["ai", "Got it — dispatching a plumber.", "9:12 AM"],
    ]),
    notifications: mkNotif([
      ["email", "dispatch@acmeplumb.com", "9:13 AM", "Service requested at unit 12C"],
      ["sms", "+1 555 0103", "9:14 AM", "Plumber confirmed — ETA 2 hrs"],
    ]),
  },
  {
    id: "REQ-1003",
    type: "emergency",
    description: "Sparking outlet in bedroom — possible fire risk.",
    tenantId: "tenant_006",
    tenantName: "Sara Nguyen",
    property: "Willow Creek Lofts",
    urgency: "high",
    status: "escalated",
    createdAt: "2026-05-22",
    createdLabel: "Yesterday",
    parties: [
      { id: "p1", name: "Sara Nguyen", role: "Tenant" },
      { id: "p2", name: "Willow Mgmt", role: "Manager" },
      { id: "p3", name: "Bolt Electric", role: "Vendor" },
    ],
    conversation: mkConv([
      ["tenant", "Outlet in my bedroom is sparking!", "8:01 PM"],
      ["ai", "This is an emergency. Please turn off the breaker. I'm escalating now.", "8:01 PM"],
    ]),
    notifications: mkNotif([
      ["sms", "+1 555 0199", "8:02 PM", "URGENT: Escalated to on-call manager"],
      ["email", "oncall@willowcreek.com", "8:02 PM", "Emergency electrical — unit 9F"],
    ]),
  },
  {
    id: "REQ-1004",
    type: "hvac",
    description: "AC unit not cooling, blowing warm air.",
    tenantId: "tenant_009",
    tenantName: "Tom Becker",
    property: "Sunset Apartments",
    urgency: "medium",
    status: "pending",
    createdAt: "2026-05-21",
    createdLabel: "2 days ago",
    parties: [
      { id: "p1", name: "Tom Becker", role: "Tenant" },
      { id: "p2", name: "Sunset Mgmt", role: "Manager" },
    ],
    conversation: mkConv([
      ["tenant", "AC is blowing warm air", "1:00 PM"],
      ["ai", "Understood. What's your unit temperature right now?", "1:01 PM"],
    ]),
    notifications: mkNotif([
      ["email", "manager@sunsetapts.com", "1:05 PM", "HVAC request logged for unit 8C"],
    ]),
  },
  {
    id: "REQ-1005",
    type: "lease_question",
    description: "Request to extend lease by 6 months.",
    tenantId: "tenant_002",
    tenantName: "Maria Lopez",
    property: "Sunset Apartments",
    urgency: "low",
    status: "pending_approval",
    createdAt: "2026-05-22",
    createdLabel: "Yesterday",
    parties: [
      { id: "p1", name: "Maria Lopez", role: "Tenant" },
      { id: "p2", name: "Owner: K. Lee", role: "Owner" },
    ],
    conversation: mkConv([
      ["tenant", "I'd like to extend my lease by 6 months.", "11:20 AM"],
      ["ai", "Got it. I'll forward this to the owner for approval.", "11:21 AM"],
    ]),
    notifications: mkNotif([
      ["email", "owner@sunsetapts.com", "11:22 AM", "Lease extension approval requested for unit 5A"],
    ]),
  },
  {
    id: "REQ-1006",
    type: "lockout",
    description: "Locked out, needs immediate entry.",
    tenantId: "tenant_008",
    tenantName: "Elena Rossi",
    property: "Willow Creek Lofts",
    urgency: "high",
    status: "in_progress",
    createdAt: "2026-05-23",
    createdLabel: "Today",
    parties: [
      { id: "p1", name: "Elena Rossi", role: "Tenant" },
      { id: "p2", name: "Locksmith Co.", role: "Vendor" },
    ],
    conversation: mkConv([
      ["tenant", "Locked out of my unit!", "7:42 AM"],
      ["ai", "Dispatching locksmith. ETA 20 minutes.", "7:43 AM"],
    ]),
    notifications: mkNotif([
      ["sms", "+1 555 0144", "7:43 AM", "Locksmith en route to 6E"],
    ]),
  },
  {
    id: "REQ-1007",
    type: "appliance",
    description: "Dishwasher won't drain.",
    tenantId: "tenant_004",
    tenantName: "Aisha Patel",
    property: "Riverbend Residences",
    urgency: "low",
    status: "in_progress",
    createdAt: "2026-05-22",
    createdLabel: "Yesterday",
    parties: [
      { id: "p1", name: "Aisha Patel", role: "Tenant" },
      { id: "p2", name: "FixIt Appliances", role: "Vendor" },
    ],
    conversation: mkConv([
      ["tenant", "Dishwasher won't drain", "3:15 PM"],
      ["ai", "Technician scheduled for tomorrow 10am.", "3:20 PM"],
    ]),
    notifications: mkNotif([
      ["email", "service@fixit.com", "3:21 PM", "Dishwasher service scheduled at 7D"],
    ]),
  },
  {
    id: "REQ-1008",
    type: "pest_control",
    description: "Reports of ants in kitchen.",
    tenantId: "tenant_005",
    tenantName: "Liam O'Brien",
    property: "Maple Heights",
    urgency: "medium",
    status: "pending",
    createdAt: "2026-05-21",
    createdLabel: "2 days ago",
    parties: [
      { id: "p1", name: "Liam O'Brien", role: "Tenant" },
      { id: "p2", name: "Maple Mgmt", role: "Manager" },
    ],
    conversation: mkConv([
      ["tenant", "Lots of ants in my kitchen", "5:55 PM"],
      ["ai", "Noted. I'll coordinate pest control.", "5:56 PM"],
    ]),
    notifications: mkNotif([
      ["email", "manager@mapleheights.com", "5:57 PM", "Pest control needed at 2A"],
    ]),
  },
  {
    id: "REQ-1009",
    type: "access_control",
    description: "Front door handle is loose.",
    tenantId: "tenant_007",
    tenantName: "Marcus Reed",
    property: "Willow Creek Lofts",
    urgency: "medium",
    status: "in_progress",
    createdAt: "2026-05-22",
    createdLabel: "Yesterday",
    parties: [
      { id: "p1", name: "Marcus Reed", role: "Tenant" },
      { id: "p2", name: "Handyman LLC", role: "Vendor" },
    ],
    conversation: mkConv([
      ["tenant", "Front door handle is loose", "12:00 PM"],
      ["ai", "Handyman scheduled for tomorrow.", "12:05 PM"],
    ]),
    notifications: mkNotif([
      ["email", "ops@handyman.com", "12:06 PM", "Door repair at 4B"],
    ]),
  },
  {
    id: "REQ-1010",
    type: "noise",
    description: "Loud music from upstairs neighbor at night.",
    tenantId: "tenant_001",
    tenantName: "John Carter",
    property: "Sunset Apartments",
    urgency: "low",
    status: "pending_review",
    createdAt: "2026-05-22",
    createdLabel: "Yesterday",
    parties: [
      { id: "p1", name: "John Carter", role: "Tenant" },
      { id: "p2", name: "Sunset Mgmt", role: "Manager" },
    ],
    conversation: mkConv([
      ["tenant", "Loud music every night from upstairs", "11:30 PM"],
      ["ai", "Logging the complaint for review.", "11:31 PM"],
    ]),
    notifications: mkNotif([
      ["email", "manager@sunsetapts.com", "11:32 PM", "Noise complaint logged for review"],
    ]),
  },
  {
    id: "REQ-1011",
    type: "emergency",
    description: "Stranger seen attempting to enter building.",
    tenantId: "tenant_010",
    tenantName: "Priya Shah",
    property: "Poplar Gardens",
    urgency: "high",
    status: "escalated",
    createdAt: "2026-05-23",
    createdLabel: "Today",
    parties: [
      { id: "p1", name: "Priya Shah", role: "Tenant" },
      { id: "p2", name: "Poplar Security", role: "Vendor" },
    ],
    conversation: mkConv([
      ["tenant", "A stranger is trying to get in the building", "6:30 AM"],
      ["ai", "Escalating to security and management immediately.", "6:30 AM"],
    ]),
    notifications: mkNotif([
      ["sms", "+1 555 0181", "6:31 AM", "URGENT: Security dispatched to Poplar Gardens"],
      ["email", "security@poplar.com", "6:31 AM", "Suspicious activity reported"],
    ]),
  },
];

export const requestById = (id: string) => requests.find((r) => r.id === id);
