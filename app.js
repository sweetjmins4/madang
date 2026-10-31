const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const statusMessage = document.querySelector("#statusMessage");
const bookList = document.querySelector("#bookList");
const signUpForm = document.querySelector("#signUpForm");
const signInForm = document.querySelector("#signInForm");
const signOutButton = document.querySelector("#signOutButton");
const guestArea = document.querySelector("#guestArea");
const memberArea = document.querySelector("#memberArea");
const memberEmail = document.querySelector("#memberEmail");
const authMessage = document.querySelector("#authMessage");
const ordersSection = document.querySelector("#ordersSection");
const ordersMessage = document.querySelector("#ordersMessage");
const ordersList = document.querySelector("#ordersList");
const purchaseMessage = document.querySelector("#purchaseMessage");
let activeUserId = null;
let ordersRequestId = 0;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function setOrdersMessage(message, isError = false) {
  ordersMessage.textContent = message;
  ordersMessage.classList.toggle("error", isError);
}

function setPurchaseMessage(message, isError = false) {
  purchaseMessage.textContent = message;
  purchaseMessage.classList.toggle("error", isError);
}

function clearOrders() {
  ordersRequestId += 1;
  ordersList.replaceChildren();
  setOrdersMessage("");
  setPurchaseMessage("");
}

function updateAuthView(session) {
  const isSignedIn = Boolean(session?.user);
  const nextUserId = isSignedIn ? session.user.id : null;
  const userChanged = activeUserId !== nextUserId;

  activeUserId = nextUserId;
  guestArea.hidden = isSignedIn;
  memberArea.hidden = !isSignedIn;
  memberEmail.textContent = isSignedIn ? session.user.email : "";
  ordersSection.hidden = !isSignedIn;

  if (userChanged) {
    clearOrders();
  }
}

function setAuthButtonsDisabled(isDisabled) {
  signUpForm.querySelector("button").disabled = isDisabled;
  signInForm.querySelector("button").disabled = isDisabled;
  signOutButton.disabled = isDisabled;
}

function formatPrice(price) {
  return `${Number(price).toLocaleString("ko-KR")}원`;
}

function renderBooks(books) {
  bookList.replaceChildren();

  books.forEach((book) => {
    const card = document.createElement("article");
    const title = document.createElement("h2");
    const author = document.createElement("p");
    const price = document.createElement("p");
    const purchaseControls = document.createElement("div");
    const quantityLabel = document.createElement("label");
    const quantityInput = document.createElement("input");
    const purchaseButton = document.createElement("button");

    card.className = "book-card";
    author.className = "book-author";
    price.className = "book-price";
    purchaseControls.className = "purchase-controls";
    quantityLabel.htmlFor = `quantity-${book.id}`;
    quantityLabel.textContent = "수량 (1~10권)";
    quantityInput.id = `quantity-${book.id}`;
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.max = "10";
    quantityInput.step = "1";
    quantityInput.value = "1";
    purchaseButton.type = "button";
    purchaseButton.textContent = "구매";

    // DB에서 받은 문자열은 HTML로 해석하지 않고 텍스트로 표시합니다.
    title.textContent = book.title;
    author.textContent = `저자: ${book.author}`;
    price.textContent = formatPrice(book.price);

    purchaseButton.addEventListener("click", () => {
      purchaseBook(book, quantityInput, purchaseButton);
    });

    purchaseControls.append(quantityLabel, quantityInput, purchaseButton);
    card.append(title, author, price, purchaseControls);
    bookList.append(card);
  });
}

async function purchaseBook(book, quantityInput, purchaseButton) {
  if (!activeUserId) {
    setAuthMessage("구매하려면 먼저 로그인해 주세요.", true);
    return;
  }

  const purchaseUserId = activeUserId;
  const quantity = Number(quantityInput.value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    setPurchaseMessage("수량은 1부터 10 사이의 정수로 입력해 주세요.", true);
    return;
  }

  const expectedPrice = book.price * quantity;
  const isConfirmed = window.confirm(
    `도서명: ${book.title}\n수량: ${quantity}권\n예상 금액: ${formatPrice(expectedPrice)}\n\n모의 구매를 진행할까요?`
  );

  if (!isConfirmed) {
    return;
  }

  purchaseButton.disabled = true;
  setPurchaseMessage("모의 구매를 처리하는 중입니다.");

  const { error } = await sb.rpc("purchase_book", {
    p_book_id: book.id,
    p_quantity: quantity,
  });

  purchaseButton.disabled = false;

  // 구매 처리 중 회원이 바뀌었다면 이전 회원의 결과를 현재 화면에 표시하지 않습니다.
  if (activeUserId !== purchaseUserId) {
    return;
  }

  if (error) {
    setPurchaseMessage(`모의 구매에 실패했습니다: ${error.message}`, true);
    return;
  }

  setPurchaseMessage("모의 구매가 완료되었습니다");
  loadOrders(purchaseUserId);
}

async function loadBooks(searchKeyword = "") {
  setStatus("도서 목록을 불러오는 중입니다.");
  bookList.replaceChildren();

  let query = sb.from("books").select("id, title, author, price").order("id");

  // 검색어가 있을 때만 제목에 포함된 도서를 like로 찾습니다.
  if (searchKeyword) {
    query = query.like("title", `%${searchKeyword}%`);
  }

  const { data: books, error } = await query;

  if (error) {
    setStatus(`도서 목록을 불러오지 못했습니다: ${error.message}`, true);
    return;
  }

  if (books.length === 0) {
    setStatus("검색 결과가 없습니다.");
    return;
  }

  setStatus(`도서 ${books.length}권을 찾았습니다.`);
  renderBooks(books);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadBooks(searchInput.value.trim());
});

function formatOrderDate(createdAt) {
  return new Date(createdAt).toLocaleString("ko-KR");
}

function renderOrders(orders) {
  ordersList.replaceChildren();

  orders.forEach((order) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const quantity = document.createElement("p");
    const amount = document.createElement("p");
    const createdAt = document.createElement("p");

    card.className = "order-card";
    title.textContent = order.book_title;
    quantity.textContent = `수량: ${order.quantity}권`;
    amount.textContent = `결제 금액: ${formatPrice(order.unit_price * order.quantity)}`;
    createdAt.textContent = `주문 시각: ${formatOrderDate(order.created_at)}`;

    card.append(title, quantity, amount, createdAt);
    ordersList.append(card);
  });
}

async function loadOrders(userId) {
  if (!userId) {
    return;
  }

  const requestId = ++ordersRequestId;
  setOrdersMessage("주문 내역을 불러오는 중입니다.");
  ordersList.replaceChildren();

  const { data: orders, error } = await sb
    .from("orders")
    .select("book_title, quantity, unit_price, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // 로그아웃 또는 다른 회원 로그인 후 도착한 이전 요청은 표시하지 않습니다.
  if (requestId !== ordersRequestId || activeUserId !== userId) {
    return;
  }

  if (error) {
    setOrdersMessage(`주문 내역을 불러오지 못했습니다: ${error.message}`, true);
    return;
  }

  if (orders.length === 0) {
    setOrdersMessage("아직 주문 내역이 없습니다.");
    return;
  }

  setOrdersMessage(`주문 ${orders.length}건을 불러왔습니다.`);
  renderOrders(orders);
}

signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthButtonsDisabled(true);
  setAuthMessage("회원가입을 처리하는 중입니다.");

  const email = document.querySelector("#signUpEmail").value.trim();
  const password = document.querySelector("#signUpPassword").value;
  const { data, error } = await sb.auth.signUp({ email, password });

  setAuthButtonsDisabled(false);
  document.querySelector("#signUpPassword").value = "";

  if (error) {
    setAuthMessage(`회원가입에 실패했습니다: ${error.message}`, true);
    return;
  }

  if (!data.session) {
    setAuthMessage("가입했습니다. 이메일 확인이 필요하면 받은 편지함을 확인해 주세요.");
    return;
  }

  setAuthMessage("회원가입과 로그인이 완료되었습니다.");
});

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthButtonsDisabled(true);
  setAuthMessage("로그인하는 중입니다.");

  const email = document.querySelector("#signInEmail").value.trim();
  const password = document.querySelector("#signInPassword").value;
  const { error } = await sb.auth.signInWithPassword({ email, password });

  setAuthButtonsDisabled(false);
  document.querySelector("#signInPassword").value = "";

  if (error) {
    setAuthMessage(`로그인에 실패했습니다: ${error.message}`, true);
    return;
  }

  setAuthMessage("로그인되었습니다.");
});

signOutButton.addEventListener("click", async () => {
  setAuthButtonsDisabled(true);
  setAuthMessage("로그아웃하는 중입니다.");

  const { error } = await sb.auth.signOut();
  setAuthButtonsDisabled(false);

  if (error) {
    setAuthMessage(`로그아웃에 실패했습니다: ${error.message}`, true);
    return;
  }

  setAuthMessage("로그아웃되었습니다.");
});

async function restoreSession() {
  const { data, error } = await sb.auth.getSession();

  if (error) {
    setAuthMessage(`로그인 상태를 확인하지 못했습니다: ${error.message}`, true);
    return;
  }

  updateAuthView(data.session);
  loadOrders(activeUserId);
}

// 인증 상태가 바뀌면 화면을 먼저 즉시 갱신합니다.
sb.auth.onAuthStateChange((_event, session) => {
  updateAuthView(session);
  // 콜백은 기다리지 않고 끝냅니다. 주문 조회는 다음 작업 순서에서 시작합니다.
  window.setTimeout(() => loadOrders(activeUserId), 0);
});

restoreSession();
loadBooks();
