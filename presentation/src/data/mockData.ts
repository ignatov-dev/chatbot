export const MOCK_EMAIL = "demo@xbo.com";
export const MOCK_PASSWORD_DOTS = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

export const THEMES = [
  "CryptoPayX",
  "Deposit & Withdrawal",
  "Verification",
  "Loyalty Program",
];

export type MockConversation = {
  id: string;
  title: string;
  time: string;
};

export const CONVERSATIONS: MockConversation[] = [
  { id: "1", title: "Create a payment intent", time: "2m ago" },
  { id: "2", title: "Payment intent statuses", time: "1h ago" },
  { id: "3", title: "CryptoPayX deposit flow", time: "3h ago" },
  { id: "4", title: "Payout API integration", time: "1d ago" },
  { id: "5", title: "Sandbox testing setup", time: "2d ago" },
];

export const CHAT_FLOW_BASIC = {
  userMessage: "How do I create a payment intent?",
  assistantMessage:
    "To create a payment intent via the CryptoPayX API:\n\n1. Send a **POST** request to `/v2/payment-intents/`\n2. Include the required parameters:\n   - **currencyFrom** — cryptocurrency (e.g. USDT)\n   - **currencyTo** — fiat currency (e.g. USD)\n   - **amountTo** — the fiat amount to receive\n3. Optionally include **networkCode**, **customOrderId**, or **callbackUrl**\n4. The response returns a **deposit address** and **quoteValidTo** timestamp\n5. Share the address with the payer to complete the deposit\n\n> **Tip:** Use `POST /v2/payment-intents/estimated-quote` first to preview the conversion rate before creating the intent.",
};

export const CHAT_FLOW_MARKDOWN = {
  userMessage: "What are the payment intent statuses?",
  assistantMessage:
    "## Payment Intent Statuses\n\nEach payment intent goes through the following lifecycle:\n\n| Status | Description |\n|--------|-------------|\n| Pending | Initiated, awaiting deposit |\n| Processing | Transaction received, being processed |\n| Completed | Received amount matches expected |\n| PartiallyCompleted | Amount differs but within threshold |\n| ManualActionRequired | Threshold not satisfied |\n| Failed | No funds received within timeframe |\n\n### Manual Resolution Statuses\n\n- **ManuallyCompletedWithRefund** — resolved via crypto refund\n- **ManuallyCompletedWithRetry** — resolved via manual retry\n- **ManuallyCompletedAmountAcceptable** — merchant accepted the received amount\n\n> The threshold percentage controls automatic completion. Contact CryptoPayX support to configure it.",
};

export const CHAT_FLOW_VIDEO = {
  userMessage: "How do I make a deposit?",
  assistantMessage:
    'To make a deposit, you can follow the steps outlined in the video tutorial below:\n\n<video src="https://www.xbo.com/_astro/video--1.CTEIxdIn.mp4"></video>\n\nThis video will guide you through the process of making a CryptoPayX deposit. If you have any further questions or need assistance, feel free to ask.',
};

export const FEATURE_LABELS = [
  { text: "Conversation History", x: 130, y: 250 },
  { text: "Multi-Theme Knowledge Base", x: 620, y: 155 },
  { text: "Real-time AI Responses", x: 730, y: 450 },
  { text: "Smart Input with Limits", x: 730, y: 700 },
  { text: "Always Online", x: 500, y: 95 },
];
