const STORAGE_KEY = "expenses";

// Expense Tracker — Assignment 2
// This file holds all of the app behavior: state, rendering, events,
// localStorage persistence, and the async currency conversion request.

// Key used to save and load expenses from localStorage.
const STORAGE_KEY = "expenses";

// ---------- State ----------
// expenses is the single source of truth for the app.
// The page is re-rendered from this array whenever something changes.
let expenses = loadExpenses();
let currentFilter = "All";
let currentSort = "date-desc";

// ---------- DOM selections ----------
// Form inputs
const expenseForm = document.querySelector("#expense-form");
const descriptionInput = document.querySelector("#description-input");
const amountInput = document.querySelector("#amount-input");
const categoryInput = document.querySelector("#category-input");
const dateInput = document.querySelector("#date-input");

// Error and summary text
const formError = document.querySelector("#form-error");
const summary = document.querySelector("#summary");

// Filter and sort controls
const filterCategory = document.querySelector("#filter-category");
const sortSelect = document.querySelector("#sort-select");

// Totals area
const totalAmount = document.querySelector("#total-amount");
const expenseCount = document.querySelector("#expense-count");
const categoryTotals = document.querySelector("#category-totals");

// Expense output area
const emptyMessage = document.querySelector("#empty-message");
const expenseList = document.querySelector("#expense-list");

// Currency conversion area
const convertBtn = document.querySelector("#convert-btn");
const convertedTotal = document.querySelector("#converted-total");
const conversionError = document.querySelector("#conversion-error");

// ---------- Small helper functions ----------

function getToday() {
  // The date input expects YYYY-MM-DD, so slice the first 10 characters.
  return new Date().toISOString().slice(0, 10);
}

function makeId() {
  // Date.now() gives a simple unique-enough id for this small app.
  return Date.now();
}

function formatCurrency(amount) {
  // Format USD amounts like $12.50.
  return "$" + amount.toFixed(2);
}

function formatEUR(amount) {
  // Format converted EUR amounts like €10.20.
  return "€" + amount.toFixed(2);
}

function clearConversion() {
  // Clears old conversion output before starting fresh.
  convertedTotal.textContent = "";
  conversionError.textContent = "";
}

// ---------- localStorage ----------

function loadExpenses() {
  // Read the saved JSON string from localStorage.
  const savedExpenses = localStorage.getItem(STORAGE_KEY);

  // If nothing was saved yet, start with an empty array.
  if (savedExpenses === null) {
    return [];
  }

  try {
    // Convert the saved JSON string back into a JavaScript array.
    const parsedExpenses = JSON.parse(savedExpenses);

    // Only use the saved value if it is actually an array.
    if (Array.isArray(parsedExpenses)) {
      return parsedExpenses;
    }

    return [];
  } catch {
    // If JSON.parse fails because the storage data is corrupt,
    // fall back to an empty list instead of crashing the app.
    return [];
  }
}

function saveExpenses() {
  // localStorage only stores strings, so the array is converted to JSON.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// ---------- Data helpers ----------

function getVisibleExpenses() {
  // First apply the selected category filter.
  let visibleExpenses = expenses.filter((expense) => {
    if (currentFilter === "All") {
      return true;
    }

    return expense.category === currentFilter;
  });

  // Then sort the filtered expenses based on the selected sort option.
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
  // Add up all amounts in the array.
  return expenseArray.reduce((total, expense) => {
    return total + expense.amount;
  }, 0);
}

function getCategoryTotals(expenseArray) {
  // Build an object like { Food: 20, Transport: 10 }.
  return expenseArray.reduce((totals, expense) => {
    if (totals[expense.category] === undefined) {
      totals[expense.category] = 0;
    }

    totals[expense.category] += expense.amount;
    return totals;
  }, {});
}

// ---------- Rendering ----------

function renderExpense(expense) {
  // Return one list item for one expense object.
  // render() uses this with map() to create the full list.
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
  // Delete buttons are created during render(), so listeners are attached
  // after the list is placed into the DOM.
  const deleteButtons = document.querySelectorAll(".delete-btn");

  for (const button of deleteButtons) {
    button.addEventListener("click", () => {
      deleteExpense(Number(button.value));
    });
  }
}

function render() {
  // All visible UI is based on the current state.
  const visibleExpenses = getVisibleExpenses();
  const total = getTotal(visibleExpenses);
  const count = visibleExpenses.length;
  const totalsByCategory = getCategoryTotals(visibleExpenses);

  // Update top summary and summary cards.
  summary.textContent = formatCurrency(total) + " across " + count + " expenses";
  totalAmount.textContent = formatCurrency(total);
  expenseCount.textContent = count + " expenses shown";

  // Rebuild the category totals list.
  categoryTotals.innerHTML = "";

  for (const category in totalsByCategory) {
    categoryTotals.innerHTML += `
      <li>${category}: ${formatCurrency(totalsByCategory[category])}</li>
    `;
  }

  // Show a friendly empty message instead of an empty list.
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

  // Render the expense rows from the state array.
  expenseList.innerHTML = visibleExpenses.map(renderExpense).join("");

  // Add delete behavior to the newly rendered buttons.
  addDeleteButtonListeners();
}

// ---------- Event handlers ----------

function handleAddExpense(event) {
  // Stop the browser from refreshing the page when the form submits.
  event.preventDefault();

  formError.textContent = "";

  // Read form values.
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  // JavaScript validation required by the assignment.
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

  // Create the new expense object.
  const newExpense = {
    id: makeId(),
    description: description,
    amount: amount,
    category: category,
    date: date
  };

  // Update state, save it, and re-render the page.
  expenses.push(newExpense);
  saveExpenses();
  render();

  // Reset the form and put today's date back into the date input.
  expenseForm.reset();
  dateInput.value = getToday();
}

function deleteExpense(id) {
  // Keep every expense except the one whose id matches the clicked button.
  expenses = expenses.filter((expense) => {
    return expense.id !== id;
  });

  saveExpenses();
  render();
}

async function convertToEUR() {
  // Convert the currently visible total, so the conversion matches filters.
  const visibleExpenses = getVisibleExpenses();
  const total = getTotal(visibleExpenses);

  convertedTotal.textContent = "";
  conversionError.textContent = "";

  if (total === 0) {
    conversionError.textContent = "Add an expense before converting.";
    return;
  }

  // Loading state while the network request is running.
  convertBtn.disabled = true;
  convertBtn.textContent = "Converting...";

  try {
    // Fetch exchange rates where USD is the base currency.
    const response = await fetch("https://open.er-api.com/v6/latest/USD");

    if (!response.ok) {
      conversionError.textContent = "The exchange rate request failed.";
      return;
    }

    // Convert the JSON response into a JavaScript object.
    const data = await response.json();
    const rate = data.rates.EUR;

    if (rate === undefined) {
      conversionError.textContent = "The EUR exchange rate was not found.";
      return;
    }

    const eurTotal = total * rate;
    convertedTotal.textContent = "EUR total: " + formatEUR(eurTotal);
  } catch {
    // Handles network errors or invalid API responses.
    conversionError.textContent = "Could not convert right now. Please try again.";
  } finally {
    // Always restore the button after the request finishes.
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert to EUR";
  }
}

// ---------- Event listeners ----------
// No inline onclick attributes are used; all events are wired here.

expenseForm.addEventListener("submit", handleAddExpense);

filterCategory.addEventListener("change", () => {
  currentFilter = filterCategory.value;
  render();
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  render();
});

convertBtn.addEventListener("click", convertToEUR);

// ---------- Initial page setup ----------

dateInput.value = getToday();
clearConversion();
render();
