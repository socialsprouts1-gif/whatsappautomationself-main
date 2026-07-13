"use client";

import { useState } from "react";
import { Plus, Package, Trash2 } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  stock: number;
  imageUrl?: string;
  createdAt: string;
}

interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

interface Order {
  id: string;
  contactId?: string;
  contactName: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

const STATUS_OPTIONS: OrderStatus[] = ["pending", "paid", "shipped", "delivered", "cancelled"];

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function CommercePage() {
  const [tab, setTab] = useState<"products" | "orders">("products");
  const { data: productsData, refetch: refetchProducts } = useApi<{ products: Product[] }>("/api/commerce/products");
  const { data: ordersData, refetch: refetchOrders } = useApi<{ orders: Order[] }>("/api/commerce/orders");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: "", currency: "USD", stock: "", imageUrl: "" });

  const products = productsData?.products ?? [];
  const orders = ordersData?.orders ?? [];

  async function addProduct() {
    if (!form.name || !form.price) return;
    await mutate("/api/commerce/products", "POST", {
      name: form.name,
      sku: form.sku || undefined,
      price: Number(form.price),
      currency: form.currency,
      stock: form.stock ? Number(form.stock) : 0,
      imageUrl: form.imageUrl || undefined,
    });
    setForm({ name: "", sku: "", price: "", currency: "USD", stock: "", imageUrl: "" });
    setAdding(false);
    refetchProducts();
  }

  async function deleteProduct(id: string) {
    await fetch(`/api/commerce/products?id=${id}`, { method: "DELETE" });
    refetchProducts();
  }

  async function setOrderStatus(id: string, status: OrderStatus) {
    await mutate("/api/commerce/orders", "PATCH", { id, status });
    refetchOrders();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Commerce" subtitle="Products and orders synced with your WhatsApp storefront" />
      <div className="p-6 space-y-5">

        <div className="flex items-center gap-2">
          <button onClick={() => setTab("products")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "products" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}>
            Products
          </button>
          <button onClick={() => setTab("orders")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "orders" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600"
            }`}>
            Orders
          </button>
        </div>

        {tab === "products" && (
          <>
            <div className="flex items-center justify-end">
              <button onClick={() => setAdding((a) => !a)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> Add product
              </button>
            </div>

            {adding && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">New product</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name"
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU (optional)"
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price"
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                  </select>
                  <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stock"
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Image URL (optional)"
                  className="w-full mt-3 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                <div className="flex gap-2 mt-3">
                  <button onClick={addProduct} disabled={!form.name || !form.price}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => setAdding(false)}
                    className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {products.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="py-12 text-center text-gray-400 text-sm">No products yet.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded-lg mb-3 bg-gray-100" />
                    ) : (
                      <div className="w-full h-32 rounded-lg mb-3 bg-gray-100 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="font-semibold text-gray-800 text-sm truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-gray-800">{money(p.price, p.currency)}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={p.stock < 10
                          ? { background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }
                          : { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                        {p.stock} in stock
                      </span>
                    </div>
                    <button onClick={() => deleteProduct(p.id)}
                      className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-gray-100 text-xs text-red-500 hover:text-red-700">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "orders" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              {["Contact", "Items", "Total", "Status", "Created"].map((h, i) => (
                <div key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                  i === 0 ? "col-span-2" : i === 1 ? "col-span-5" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : "col-span-1"
                }`}>{h}</div>
              ))}
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No orders yet.</div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-2 text-sm font-medium text-gray-800 truncate">{o.contactName}</div>
                  <div className="col-span-5 text-sm text-gray-500 truncate">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                  <div className="col-span-2 text-sm font-semibold text-gray-800">{money(o.total, o.currency)}</div>
                  <div className="col-span-2">
                    <select value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value as OrderStatus)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 text-gray-700 capitalize">
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 text-[11px] text-gray-400">{timeAgo(o.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
