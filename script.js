const STORAGE_KEY = "expenses";

let expenses = loadExpenses();
let currentFilter = "All";
let currentSort = "date-desc";

const expenseForm = document.querySelector("#expense-form");
const descriptionInput = document.querySelector("#description-input");
const amountInput = document.querySelector("#amount-input");
const categoryInput = document.querySelector("#category-input");
const dateInput = document.querySelector("#date-input");

const formError = document.querySelector("#form-error");
const summary = document.querySelector("#summary");

const filterCategory = document.querySelector("#filter-category");
const sortSelect = document.querySelector("#sort-select");

const totalAmount = document.querySelector("#total-amount");
const expenseCount = document.querySelector("#expense-count");
const categoryTotals = document.querySelector("#category-totals");

const emptyMessage = document.querySelector("#empty-message");
const expenseList = document.querySelector("#expense-list");

const convertBtn = document.querySelector("#convert-btn");
const convertedTotal = document.querySelector("#converted-total");
const conversionError = document.querySelector("#conversion-error");

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function makeId() {
  return Date.now();
}

function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}

function loadExpenses() {
  const savedExpenses = localStorage.getItem(STORAGE_KEY);

  if (savedExpenses === null) {
    return [];
  }

  try {
    const parsedExpenses = JSON.parse(savedExpenses);

    if (Array.isArray(parsedExpenses)) {
      return parsedExpenses;
    }

    return [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function getVisibleExpenses() {
  let visibleExpenses = expenses.filter((expense) => {
    if (currentFilter === "All") {
      return true;
    }

    return expense.category === currentFilter;
  });

  if (currentSort === "date-desc") {
    visibleExpenses.sort((a, b) => {
      return b.date.localeCompare(a.date);
    });
  }

  if (currentSort === "date-asc") {
    visibleExpenses.sort((a, b) => {
      return a.date.localeCompare(b.date);
    });
  }

  if (currentSort === "amount-desc") {
    visibleExpenses.sort((a, b) => {
      return b.amount - a.amount;
    });
  }

  if (currentSort === "amount-asc") {
    visibleExpenses.sort((a, b) => {
      return a.amount - b.amount;
    });
  }

  return visibleExpenses;
}

function getTotal(expenseArray) {
  return expenseArray.reduce((total, expense) => {
    return total + expense.amount;
  }, 0);
}

function getCategoryTotals(expenseArray) {
  return expenseArray.reduce((totals, expense) => {
    if (totals[expense.category] === undefined) {
      totals[expense.category] = 0;
    }

    totals[expense.category] += expense.amount;
    return totals;
  }, {});
}

function renderExpense(expense) {
  return `
    <li class="expense">
      <span class="category">${expense.category}</span>
      <span class="description">${expense.description}</span>
      <span class="amount">${formatCurrency(expense.amount)}</span>
      <span class="date">${expense.date}</span>
      <button class="delete-btn" type="button" value="${expense.id}">×</button>
    </li>
  `;
}

function addDeleteButtonListeners() {
  const deleteButtons = document.querySelectorAll(".delete-btn");

  for (const button of deleteButtons) {
    button.addEventListener("click", () => {
      deleteExpense(Number(button.value));
    });
  }
}

function render() {
  const visibleExpenses = getVisibleExpenses();
  const total = getTotal(visibleExpenses);
  const count = visibleExpenses.length;
  const totalsByCategory = getCategoryTotals(visibleExpenses);

  summary.textContent = formatCurrency(total) + " across " + count + " expenses";
  totalAmount.textContent = formatCurrency(total);
  expenseCount.textContent = count + " expenses shown";

  categoryTotals.innerHTML = "";

  for (const category in totalsByCategory) {
    categoryTotals.innerHTML += `
      <li>${category}: ${formatCurrency(totalsByCategory[category])}</li>
    `;
  }

  if (visibleExpenses.length === 0) {
    emptyMessage.style.display = "block";

    if (currentFilter === "All") {
      emptyMessage.textContent = "No expenses to show yet.";
    } else {
      emptyMessage.textContent = "No expenses match this category.";
    }
  } else {
    emptyMessage.style.display = "none";
  }

  expenseList.innerHTML = visibleExpenses.map(renderExpense).join("");
  addDeleteButtonListeners();
}

function handleAddExpense(event) {
  event.preventDefault();

  formError.textContent = "";

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (description === "") {
    formError.textContent = "Please enter a description.";
    return;
  }

  if (Number.isNaN(amount) || amount <= 0) {
    formError.textContent = "Please enter an amount greater than 0.";
    return;
  }

  if (date === "") {
    formError.textContent = "Please choose a date.";
    return;
  }

  const newExpense = {
    id: makeId(),
    description: description,
    amount: amount,
    category: category,
    date: date
  };

  expenses.push(newExpense);
  saveExpenses();
  render();

  expenseForm.reset();
  dateInput.value = getToday();
}

function deleteExpense(id) {
  expenses = expenses.filter((expense) => {
    return expense.id !== id;
  });

  saveExpenses();
  render();
}

expenseForm.addEventListener("submit", handleAddExpense);

filterCategory.addEventListener("change", () => {
  currentFilter = filterCategory.value;
  render();
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  render();
});

dateInput.value = getToday();
render();

function formatEUR(amount) {
  return "€" + amount.toFixed(2);
}

async function convertToEUR() {
  const visibleExpenses = getVisibleExpenses();
  const total = getTotal(visibleExpenses);

  convertedTotal.textContent = "";
  conversionError.textContent = "";

  if (total === 0) {
    conversionError.textContent = "Add an expense before converting.";
    return;
  }

  convertBtn.disabled = true;
  convertBtn.textContent = "Converting...";

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");

    if (!response.ok) {
      conversionError.textContent = "The exchange rate request failed.";
      return;
    }

    const data = await response.json();
    const rate = data.rates.EUR;

    if (rate === undefined) {
      conversionError.textContent = "The EUR exchange rate was not found.";
      return;
    }

    const eurTotal = total * rate;
    convertedTotal.textContent = "EUR total: " + formatEUR(eurTotal);
  } catch {
    conversionError.textContent = "Could not convert right now. Please try again.";
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert to EUR";
  }
}

convertBtn.addEventListener("click", convertToEUR);

function clearConversion() {
  convertedTotal.textContent = "";
  conversionError.textContent = "";
}

clearConversion();
render();