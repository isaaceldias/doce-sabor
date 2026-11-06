import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// import.meta.env é preenchido pelo Vite. O fallback evita uma exceção
// quando o arquivo é aberto diretamente, mas nesse modo o .env não será lido.
const env = import.meta.env || {};
const config = {
  url: env.VITE_SUPABASE_URL,
  key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
  whatsapp: env.VITE_WHATSAPP_NUMBER || "5511999999999",
};

const supabase = config.url && config.key ? createClient(config.url, config.key) : null;
let menuItems = [], cart = [], orders = [], editingId = null;
const $ = (id) => document.getElementById(id);
const requireSupabase = () => {
  if (supabase) return true;
  toast("Supabase não configurado. Confira o .env e reinicie o Vite.");
  console.error("Supabase não inicializado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY/VITE_SUPABASE_PUBLISHABLE_KEY.");
  return false;
};
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const toast = (message) => { $("toast").innerText = message; $("toast").classList.remove("opacity-0"); setTimeout(() => $("toast").classList.add("opacity-0"), 3000); };
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

async function loadMenu() {
  if (!supabase) return showSetupError();
  const { data, error } = await supabase.from("menu").select("*").eq("active", true).order("created_at", { ascending: true });
  if (error) return showSetupError(error.message);
  menuItems = (data || []).map((item) => ({ ...item, desc: item.description || "" }));
  renderMenu(); renderAdminMenu();
}

function showSetupError(detail = "") {
  $("menu-container").innerHTML = `<div class="col-span-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900"><strong>Cardápio temporariamente indisponível.</strong><p class="mt-1 text-sm">Configure o Supabase no arquivo .env e crie as tabelas do projeto.</p>${detail ? `<small class="mt-2 block opacity-60">${escapeHtml(detail)}</small>` : ""}</div>`;
  $("loader").style.display = "none"; showCustomerView();
}

function renderMenu() {
  $("menu-container").innerHTML = menuItems.map((item) => `<article class="group overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div class="h-52 overflow-hidden bg-brand-100"><img src="${escapeHtml(item.image || `https://placehold.co/800x600/8b5a2b/fff?text=${encodeURIComponent(item.name)}`)}" alt="${escapeHtml(item.name)}" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" onerror="this.src='https://placehold.co/800x600/8b5a2b/fff?text=Doce'"></div><div class="flex flex-col p-5"><h4 class="text-lg font-bold text-brand-700">${escapeHtml(item.name)}</h4><p class="mt-1 min-h-12 text-sm leading-relaxed text-gray-500">${escapeHtml(item.desc)}</p><div class="mt-5 flex items-center justify-between border-t border-gray-100 pt-4"><strong class="text-xl text-brand-600">${money(item.price)}</strong><button onclick="addToCart('${item.id}')" class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white shadow-md transition hover:bg-brand-600" aria-label="Adicionar ${escapeHtml(item.name)}"><i class="fas fa-plus"></i></button></div></div></article>`).join("") || `<p class="col-span-full py-12 text-center text-gray-500">Em breve teremos novidades no cardápio.</p>`;
}

window.showCustomerView = () => { ["admin-login-view", "admin-view"].forEach((id) => $(id).classList.add("hidden")); $("customer-view").classList.remove("hidden"); $("customer-view").classList.add("flex"); };
window.toggleCart = () => { $("cart-modal").classList.toggle("hidden"); renderCart(); };
window.addToCart = (id) => { const item = menuItems.find((x) => x.id === id); if (!item) return; const existing = cart.find((x) => x.id === id); existing ? existing.qty++ : cart.push({ ...item, qty: 1 }); updateBadge(); toast(`${item.name} adicionado à sacola`); };
window.updateQty = (id, delta) => { const item = cart.find((x) => x.id === id); if (item) item.qty += delta; cart = cart.filter((x) => x.qty > 0); updateBadge(); renderCart(); };
function updateBadge() { const qty = cart.reduce((sum, item) => sum + item.qty, 0); $("cart-badge").innerText = qty; $("cart-badge").classList.toggle("hidden", !qty); }
function renderCart() { const total = cart.reduce((sum, x) => sum + x.price * x.qty, 0); $("empty-cart-msg").classList.toggle("hidden", cart.length > 0); $("checkout-section").classList.toggle("hidden", !cart.length); $("checkout-section").classList.toggle("flex", !!cart.length); $("cart-total").innerText = money(total); $("cart-items").querySelectorAll(".cart-line").forEach((el) => el.remove()); cart.forEach((item) => { const el = document.createElement("div"); el.className = "cart-line flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm"; el.innerHTML = `<div><strong class="text-sm">${escapeHtml(item.name)}</strong><p class="text-xs text-brand-500">${money(item.price)}</p></div><div class="flex items-center gap-3 rounded-lg bg-gray-50 p-1"><button onclick="updateQty('${item.id}',-1)" class="h-6 w-6">−</button><b>${item.qty}</b><button onclick="updateQty('${item.id}',1)" class="h-6 w-6">+</button></div>`; $("cart-items").appendChild(el); }); }

window.submitOrder = async () => { if (!supabase || !cart.length) return; const name = $("cust-name").value.trim(), phone = $("cust-phone").value.trim(); if (!name || !phone) return toast("Preencha seu nome e WhatsApp."); const total = cart.reduce((sum, x) => sum + x.price * x.qty, 0); const payload = { customer_name: name, customer_phone: phone, items: cart.map(({ name, qty, price }) => ({ name, qty, price })), total, delivery_option: $("cust-delivery").value, payment_option: $("cust-payment").value, status: "Pendente" }; const { error } = await supabase.from("orders").insert(payload); if (error) return toast("Não foi possível enviar o pedido."); const msg = [`*NOVO PEDIDO - DOCE SABOR*`, `*Cliente:* ${name}`, `*Contato:* ${phone}`, "", ...cart.map((x) => `• ${x.qty}x ${x.name} (${money(x.price * x.qty)})`), ``, `*Total:* ${money(total)}`, `*Pagamento:* ${payload.payment_option}`, `*Entrega:* ${payload.delivery_option}`].join("\n"); window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank"); cart = []; updateBadge(); renderCart(); $("cust-name").value = ""; $("cust-phone").value = ""; toggleCart(); toast("Pedido enviado com sucesso!"); };

window.showAdminLogin = () => { $("customer-view").classList.add("hidden"); $("admin-login-view").classList.remove("hidden"); };
window.loginAdmin = () => { if ($("admin-pin").value === (env.VITE_ADMIN_PIN || "admin123")) { $("admin-pin").value = ""; $("admin-login-view").classList.add("hidden"); $("admin-view").classList.remove("hidden"); $("admin-view").classList.add("flex"); loadOrders(); } else toast("Senha incorreta."); };
window.logoutAdmin = () => { $("admin-view").classList.add("hidden"); showCustomerView(); };
window.switchAdminTab = (tab) => { $("admin-orders-tab").classList.toggle("hidden", tab !== "orders"); $("admin-menu-tab").classList.toggle("hidden", tab !== "menu"); $("tab-orders").classList.toggle("border-brand-500", tab === "orders"); $("tab-menu").classList.toggle("border-brand-500", tab === "menu"); };

async function loadOrders() { if (!supabase) return; const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }); const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000; orders = (data || []).filter((order) => order.status !== "Entregue" || new Date(order.delivered_at || order.created_at).getTime() >= cutoff); window.archivedOrders = (data || []).filter((order) => order.status === "Entregue" && new Date(order.delivered_at || order.created_at).getTime() < cutoff); renderOrdersGrouped(); setupOrderGroupToggles(); }
function renderOrders() { $("admin-orders-list").innerHTML = orders.length ? orders.map((o) => `<div class="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:items-center"><div><h3 class="font-bold text-gray-800">${escapeHtml(o.customer_name)}</h3><p class="text-sm text-gray-500">${(o.items || []).map((i) => `${i.qty}x ${escapeHtml(i.name)}`).join(", ")}</p><p class="mt-1 text-xs text-gray-400">${escapeHtml(o.customer_phone)} · ${new Date(o.created_at).toLocaleString("pt-BR")}</p></div><div class="flex items-center gap-3"><strong class="text-xl text-brand-700">${money(o.total)}</strong><select onchange="updateOrderStatus('${o.id}',this.value)" class="rounded-lg border p-2"><option ${o.status === "Pendente" ? "selected" : ""}>Pendente</option><option ${o.status === "Separado" ? "selected" : ""}>Separado</option><option ${o.status === "Entregue" ? "selected" : ""}>Entregue</option></select><button onclick="deleteOrder('${o.id}')" class="text-red-500"><i class="fas fa-trash"></i></button></div></div>`).join("") : `<p class="py-8 text-center text-gray-500">Nenhum pedido encontrado.</p>`; }
window.updateOrderStatus = async (id, status) => { const values = { status, delivered_at: status === "Entregue" ? new Date().toISOString() : null }; const { error } = await supabase.from("orders").update(values).eq("id", id); if (error) return toast("Não foi possível atualizar o status."); loadOrders(); };
window.deleteOrder = async (id) => { await supabase.from("orders").delete().eq("id", id); loadOrders(); toast("Pedido excluído."); };
function renderAdminMenu() { const tbody = $("admin-menu-list"); if (!tbody) return; tbody.innerHTML = menuItems.map((x) => `<tr class="border-b"><td class="p-3"><b>${escapeHtml(x.name)}</b><p class="text-xs text-gray-500">${escapeHtml(x.desc)}</p></td><td class="p-3">${money(x.price)}</td><td class="p-3 text-center"><button onclick="editProduct('${x.id}')" class="mr-2 text-blue-500"><i class="fas fa-edit"></i></button><button onclick="deleteProduct('${x.id}')" class="text-red-500"><i class="fas fa-trash"></i></button></td></tr>`).join(""); }
window.openProductModal = () => { editingId = null; $("product-form").reset(); $("modal-title").innerText = "Novo Produto"; $("product-modal").classList.remove("hidden"); };
window.closeProductModal = () => $("product-modal").classList.add("hidden");
window.editProduct = (id) => { const x = menuItems.find((i) => i.id === id); if (!x) return; editingId = id; $("prod-name").value = x.name; $("prod-desc").value = x.desc || ""; $("prod-price").value = x.price; $("prod-image").value = x.image || ""; $("modal-title").innerText = "Editar Produto"; $("product-modal").classList.remove("hidden"); };
window.generateProductCopy = async () => {
  if (!requireSupabase()) return;
  const button = $("generate-copy-button");
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Gerando...';
  const { data, error } = await supabase.functions.invoke("generate-product-copy", {
    body: { name: $("prod-name").value.trim(), description: $("prod-desc").value.trim(), price: $("prod-price").value },
  });
  button.disabled = false;
  button.innerHTML = original;
  if (error || data?.error) return toast(data?.error || "Não foi possível gerar o texto.");
  if (data.title) $("prod-name").value = data.title;
  if (data.description) $("prod-desc").value = data.description;
  toast("Título e descrição gerados!");
};
window.saveProduct = async (e) => { e.preventDefault(); if (!requireSupabase()) return; const payload = { name: $("prod-name").value.trim(), description: $("prod-desc").value.trim(), price: Number($("prod-price").value), image: $("prod-image").value.trim(), active: true }; const query = editingId ? supabase.from("menu").update(payload).eq("id", editingId) : supabase.from("menu").insert(payload); const { error } = await query; if (error) { console.error("Erro do Supabase ao salvar produto:", error); return toast(`Erro ao salvar produto: ${error.message}`); } closeProductModal(); await loadMenu(); toast("Produto salvo!"); };
window.deleteProduct = async (id) => { await supabase.from("menu").delete().eq("id", id); await loadMenu(); toast("Produto removido."); };

function renderOrdersGrouped() {
  const groups = { Pendente: [], Separado: [], Entregue: [] };
  orders.forEach((order) => (groups[order.status] || groups.Pendente).push(order));
  const labels = { Pendente: ["Pendentes", "bg-amber-50", "border-amber-200", "text-amber-800"], Separado: ["Em preparo / separados", "bg-blue-50", "border-blue-200", "text-blue-800"], Entregue: ["Entregues", "bg-green-50", "border-green-200", "text-green-800"] };
  const card = (o) => `<article class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div class="flex items-start justify-between gap-2"><div><h3 class="font-bold text-gray-800">${escapeHtml(o.customer_name)}</h3><p class="text-sm text-gray-500">${(o.items || []).map((i) => `${i.qty}x ${escapeHtml(i.name)}`).join(", ")}</p><p class="mt-1 text-xs text-gray-400">${escapeHtml(o.customer_phone)} · ${new Date(o.created_at).toLocaleString("pt-BR")}</p></div><div class="flex gap-3">${o.status === "Pendente" ? `<button onclick="editOrder('${o.id}')" class="text-blue-500" title="Editar pedido"><i class="fas fa-edit"></i></button>` : ""}<button onclick="deleteOrder('${o.id}')" class="text-red-500"><i class="fas fa-trash"></i></button></div></div><div class="mt-4 flex items-center justify-between gap-2"><strong class="text-xl text-brand-700">${money(o.total)}</strong><div class="flex gap-1">${["Pendente", "Separado", "Entregue"].map((s) => `<button onclick="updateOrderStatus('${o.id}','${s}')" class="rounded-md px-2 py-1 text-xs font-medium ${s === o.status ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}">${s}</button>`).join("")}</div></div></article>`;
  $("admin-orders-list").innerHTML = Object.entries(groups).map(([status, list]) => { const [title, bg, border, text] = labels[status]; return `<section><div class="mb-3 flex items-center justify-between rounded-xl border ${border} ${bg} px-3 py-2"><h3 class="font-bold ${text}">${title}</h3><span class="rounded-full bg-white/70 px-2 py-1 text-xs font-bold ${text}">${list.length}</span></div><div class="flex flex-col gap-3">${list.length ? list.map(card).join("") : `<p class="rounded-xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">Nenhum pedido</p>`}</div></section>`; }).join("");
}
function setupOrderGroupToggles() { $("admin-orders-list").querySelectorAll("section").forEach((section, index) => { const header = section.firstElementChild; const content = header?.nextElementSibling; if (!header || !content) return; header.classList.add("cursor-pointer"); header.onclick = () => { content.classList.toggle("hidden"); header.classList.toggle("opacity-70"); }; if (index === 2) { content.classList.add("hidden"); header.classList.add("opacity-70"); } }); }
window.editOrder = (id) => { const order = orders.find((item) => item.id === id); if (!order || order.status !== "Pendente") return toast("Somente pedidos pendentes podem ser editados."); $("edit-order-id").value = id; $("edit-order-name").value = order.customer_name || ""; $("edit-order-phone").value = order.customer_phone || ""; $("edit-order-delivery").value = order.delivery_option || "Retirada"; $("edit-order-payment").value = order.payment_option || "PIX"; $("edit-order-items").value = (order.items || []).map((item) => `${item.qty} | ${item.name} | ${Number(item.price).toFixed(2)}`).join("\n"); $("order-edit-modal").classList.remove("hidden"); $("order-edit-modal").classList.add("flex"); };
window.closeOrderEdit = () => { $("order-edit-modal").classList.add("hidden"); $("order-edit-modal").classList.remove("flex"); };
window.saveOrderEdit = async (event) => { event.preventDefault(); if (!requireSupabase()) return; const id = $("edit-order-id").value; const items = $("edit-order-items").value.split("\n").map((line) => { const [qty, name, price] = line.split("|").map((value) => value.trim()); return { qty: Number(qty), name, price: Number(price) }; }).filter((item) => item.name && item.qty > 0 && Number.isFinite(item.price)); if (!items.length) return toast("Informe pelo menos um item válido."); const total = items.reduce((sum, item) => sum + item.qty * item.price, 0); const payload = { customer_name: $("edit-order-name").value.trim(), customer_phone: $("edit-order-phone").value.trim(), delivery_option: $("edit-order-delivery").value, payment_option: $("edit-order-payment").value, items, total }; const { error } = await supabase.from("orders").update(payload).eq("id", id).eq("status", "Pendente"); if (error) return toast(`Erro ao editar pedido: ${error.message}`); closeOrderEdit(); await loadOrders(); toast("Pedido atualizado!"); };
window.toggleOrderHistory = () => { const panel = $("admin-order-history"); const isHidden = panel.classList.toggle("hidden"); if (!isHidden) { const list = window.archivedOrders || []; panel.innerHTML = `<div class="mb-3 flex items-center justify-between"><h3 class="font-bold text-gray-800">Histórico de entregues</h3><span class="text-xs text-gray-500">Mais de 15 dias</span></div>${list.length ? `<div class="flex flex-col gap-3">${list.map((o) => `<div class="rounded-lg border border-gray-100 p-3"><div class="flex justify-between gap-3"><strong>${escapeHtml(o.customer_name)}</strong><b class="text-brand-700">${money(o.total)}</b></div><p class="text-sm text-gray-500">${(o.items || []).map((i) => `${i.qty}x ${escapeHtml(i.name)}`).join(", ")}</p><p class="text-xs text-gray-400">Entregue em ${new Date(o.delivered_at || o.created_at).toLocaleString("pt-BR")}</p></div>`).join("")}</div>` : `<p class="py-5 text-center text-sm text-gray-400">Nenhum pedido no histórico.</p>`}`; } };
window.uploadProductImage = async (event) => { if (!requireSupabase()) return; const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) return toast("A imagem deve ter no máximo 5 MB."); const status = $("image-upload-status"); status.innerText = "Enviando imagem..."; const path = `products/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`; const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false }); if (error) { status.innerText = ""; return toast(`Erro no upload: ${error.message}`); } const { data } = supabase.storage.from("product-images").getPublicUrl(path); $("prod-image").value = data.publicUrl; status.innerText = "Imagem enviada com sucesso."; };
$("loader").style.display = "none"; showCustomerView(); loadMenu();
