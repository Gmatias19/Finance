import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from "./src/data/defaultData";

const PORT = 3000;
const app = express();
app.use(express.json({ limit: "10mb" }));

// Persistent Storage Setup
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "finance_store.json");

interface FinanceStore {
  transactions: any[];
  categories: any[];
  budgets: any[];
  goals: any[];
  accounts: any[];
  lastUpdated: string;
}

// Initial clean store structure
const defaultStore: FinanceStore = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  budgets: [],
  goals: [],
  accounts: DEFAULT_ACCOUNTS,
  lastUpdated: new Date().toISOString(),
};

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

function readStore(): FinanceStore {
  try {
    ensureDataDirectory();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      accounts: Array.isArray(parsed.accounts) && parsed.accounts.length > 0 ? parsed.accounts : DEFAULT_ACCOUNTS,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Server DB] Error reading store:", err);
    return defaultStore;
  }
}

function writeStore(store: FinanceStore) {
  try {
    ensureDataDirectory();
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("[Server DB] Error writing store:", err);
  }
}

// Create HTTP server for both Express and WebSockets
const server = http.createServer(app);

// WebSocket Server for instantaneous multi-user updates
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(event: { type: string; data?: any; timestamp?: string }) {
  event.timestamp = new Date().toISOString();
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (e) {
        console.error("[WebSocket] Send error:", e);
      }
    }
  });
}

wss.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] Client connected from ${clientIp}. Total: ${wss.clients.size}`);

  // Send current store immediately upon connecting
  const currentStore = readStore();
  ws.send(
    JSON.stringify({
      type: "INIT_DATA",
      data: currentStore,
      timestamp: new Date().toISOString(),
    })
  );

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "PING") {
        ws.send(JSON.stringify({ type: "PONG" }));
      }
    } catch {
      // Ignore invalid client messages
    }
  });

  ws.on("close", () => {
    console.log(`[WebSocket] Client disconnected. Total: ${wss.clients.size}`);
  });
});

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    clientsConnected: wss.clients.size,
    timestamp: new Date().toISOString(),
  });
});

// Full data fetch
app.get("/api/finance-data", (_req, res) => {
  const store = readStore();
  res.json(store);
});

// Add new transaction (broadcasts to all users)
app.post("/api/transactions", (req, res) => {
  const tx = req.body;
  if (!tx || !tx.description || tx.amount === undefined) {
    return res.status(400).json({ error: "Dados da transação incompletos." });
  }

  const store = readStore();
  // Ensure unique ID and timestamp
  const newTx = {
    ...tx,
    id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    createdAt: tx.createdAt || new Date().toISOString(),
  };

  // Add at top
  store.transactions = [newTx, ...store.transactions.filter((t) => t.id !== newTx.id)];
  writeStore(store);

  // Broadcast to all active users
  broadcast({
    type: "TRANSACTION_CREATED",
    data: newTx,
  });

  res.status(201).json(newTx);
});

// Update transaction (broadcasts to all users)
app.put("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const store = readStore();
  let updatedTx: any = null;

  store.transactions = store.transactions.map((t) => {
    if (t.id === id) {
      updatedTx = { ...t, ...updates };
      return updatedTx;
    }
    return t;
  });

  if (!updatedTx) {
    return res.status(404).json({ error: "Transação não encontrada." });
  }

  writeStore(store);

  // Broadcast to all users
  broadcast({
    type: "TRANSACTION_UPDATED",
    data: updatedTx,
  });

  res.json(updatedTx);
});

// Delete transaction (broadcasts to all users)
app.delete("/api/transactions/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();

  const originalLength = store.transactions.length;
  store.transactions = store.transactions.filter((t) => t.id !== id);

  if (store.transactions.length === originalLength) {
    return res.status(404).json({ error: "Transação não encontrada." });
  }

  writeStore(store);

  // Broadcast to all users
  broadcast({
    type: "TRANSACTION_DELETED",
    data: { id },
  });

  res.json({ success: true, id });
});

// Budgets Endpoints
app.post("/api/budgets", (req, res) => {
  const budget = req.body;
  const store = readStore();
  const existingIndex = store.budgets.findIndex((b) => b.id === budget.id || b.categoryId === budget.categoryId);

  if (existingIndex >= 0) {
    store.budgets[existingIndex] = { ...store.budgets[existingIndex], ...budget };
  } else {
    store.budgets.push(budget);
  }

  writeStore(store);
  broadcast({ type: "BUDGET_SAVED", data: budget });
  res.json(budget);
});

app.delete("/api/budgets/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();
  store.budgets = store.budgets.filter((b) => b.id !== id);
  writeStore(store);
  broadcast({ type: "BUDGET_DELETED", data: { id } });
  res.json({ success: true });
});

// Goals Endpoints
app.post("/api/goals", (req, res) => {
  const goal = req.body;
  const store = readStore();
  const index = store.goals.findIndex((g) => g.id === goal.id);

  if (index >= 0) {
    store.goals[index] = { ...store.goals[index], ...goal };
  } else {
    store.goals.push(goal);
  }

  writeStore(store);
  broadcast({ type: "GOAL_SAVED", data: goal });
  res.json(goal);
});

app.delete("/api/goals/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();
  store.goals = store.goals.filter((g) => g.id !== id);
  writeStore(store);
  broadcast({ type: "GOAL_DELETED", data: { id } });
  res.json({ success: true });
});

// Batch Sync / Restore
app.post("/api/sync", (req, res) => {
  const payload = req.body;
  const store = readStore();

  if (Array.isArray(payload.transactions)) store.transactions = payload.transactions;
  if (Array.isArray(payload.budgets)) store.budgets = payload.budgets;
  if (Array.isArray(payload.goals)) store.goals = payload.goals;
  if (Array.isArray(payload.accounts)) store.accounts = payload.accounts;

  writeStore(store);
  broadcast({ type: "FULL_SYNC", data: store });
  res.json({ success: true, message: "Dados sincronizados com sucesso." });
});

// Vite Middleware for development & static handling for production
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Finance Server] Running on http://localhost:${PORT}`);
  });
}

start();
