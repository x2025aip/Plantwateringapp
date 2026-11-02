// ============================================================
// app.js — Tend's plant care workflow, with browser-only storage.
// ============================================================

(function () {
  "use strict";

  const storageKey = "tendPlants";
  const storage = {
    get: function (key, fallback) {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
      } catch (error) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // The dashboard still works for this visit if storage is unavailable.
      }
    }
  };

  let plants = storage.get(storageKey, STARTER_PLANTS);
  if (!Array.isArray(plants)) plants = STARTER_PLANTS.slice();

  const plantList = document.getElementById("plant-list");
  const emptyGarden = document.getElementById("empty-garden");
  const formPanel = document.getElementById("add-plant-panel");
  const plantForm = document.getElementById("plant-form");
  const feedback = document.getElementById("form-feedback");

  document.title = STARTUP.name + " | Plant care, made calmer";

  function dateString(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function today() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return dateString(date);
  }

  function dateFromString(value) {
    const parts = value.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dueDate(plant) {
    const date = dateFromString(plant.lastWatered);
    date.setDate(date.getDate() + Number(plant.interval));
    return date;
  }

  function daysUntilDue(plant) {
    return Math.round((dueDate(plant) - dateFromString(today())) / 86400000);
  }

  function dateLabel(date) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function priorityFor(plant) {
    const days = daysUntilDue(plant);
    if (days < 0) return { label: Math.abs(days) + " " + (Math.abs(days) === 1 ? "day" : "days") + " overdue", className: "overdue" };
    if (days === 0) return { label: "Water today", className: "due-today" };
    if (days <= 2) return { label: "Due soon", className: "due-soon" };
    return { label: "In " + days + " days", className: "on-track" };
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makePlantRow(plant) {
    const status = priorityFor(plant);
    const row = element("article", "plant-row " + status.className);
    const mark = element("span", "plant-mark", plant.name.trim().charAt(0).toUpperCase());
    mark.setAttribute("aria-hidden", "true");

    const details = element("div", "plant-details");
    details.append(element("h3", "", plant.name));
    details.append(element("p", "plant-location", plant.location + " · every " + plant.interval + " days"));

    const timing = element("div", "plant-timing");
    timing.append(element("span", "priority-label", status.label));
    timing.append(element("span", "due-date", "Next: " + dateLabel(dueDate(plant))));

    const actions = element("div", "plant-actions");
    const waterButton = element("button", "button water-button", "Watered");
    waterButton.type = "button";
    waterButton.addEventListener("click", function () {
      plant.lastWatered = today();
      saveAndRender();
    });

    const removeButton = element("button", "text-button", "Remove");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "Remove " + plant.name);
    removeButton.addEventListener("click", function () {
      plants = plants.filter(function (item) { return item.id !== plant.id; });
      saveAndRender();
    });

    actions.append(waterButton, removeButton);
    row.append(mark, details, timing, actions);
    return row;
  }

  function saveAndRender() {
    storage.set(storageKey, plants);
    renderPlants();
  }

  function renderPlants() {
    const orderedPlants = plants.slice().sort(function (first, second) {
      return daysUntilDue(first) - daysUntilDue(second);
    });
    plantList.replaceChildren.apply(plantList, orderedPlants.map(makePlantRow));
    emptyGarden.hidden = plants.length !== 0;
    document.getElementById("plant-total").textContent = plants.length;
    document.getElementById("needs-water").textContent = plants.filter(function (plant) { return daysUntilDue(plant) <= 0; }).length;
    document.getElementById("coming-up").textContent = plants.filter(function (plant) {
      const days = daysUntilDue(plant);
      return days > 0 && days <= 2;
    }).length;
  }

  function renderSitters() {
    const list = document.getElementById("sitter-list");
    const cards = SITTERS.map(function (sitter) {
      const card = element("article", "sitter-row");
      const avatar = element("span", "sitter-avatar", sitter.name.charAt(0));
      avatar.setAttribute("aria-hidden", "true");
      const details = element("div", "sitter-details");
      details.append(element("h2", "", sitter.name));
      details.append(element("p", "", sitter.area + " · " + sitter.experience));
      const action = element("div", "sitter-action");
      action.append(element("strong", "sitter-rate", sitter.rate));
      const button = element("button", "button secondary sitter-button", "View profile");
      button.type = "button";
      button.addEventListener("click", function () {
        button.textContent = "Booking coming later";
        button.disabled = true;
      });
      action.append(button);
      card.append(avatar, details, action);
      return card;
    });
    list.replaceChildren.apply(list, cards);
  }

  function showView() {
    const requested = (window.location.hash || "#garden").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) { return view.id === requested; });
    const current = exists ? requested : "garden";
    views.forEach(function (view) { view.hidden = view.id !== current; });
    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }

  document.getElementById("today-label").textContent = "YOUR INDOOR GARDEN · " + new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
  document.getElementById("show-add-form").addEventListener("click", function () {
    formPanel.hidden = false;
    plantForm.elements.name.focus();
  });
  document.getElementById("close-add-form").addEventListener("click", function () {
    formPanel.hidden = true;
    feedback.textContent = "";
  });
  plantForm.elements.lastWatered.value = today();
  plantForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const values = new FormData(plantForm);
    plants.push({
      id: "plant-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: values.get("name").trim(),
      location: values.get("location").trim(),
      interval: Number(values.get("interval")),
      lastWatered: values.get("lastWatered")
    });
    saveAndRender();
    plantForm.reset();
    plantForm.elements.interval.value = 7;
    plantForm.elements.lastWatered.value = today();
    feedback.textContent = "Plant added to your garden.";
  });

  window.addEventListener("hashchange", showView);
  renderPlants();
  renderSitters();
  showView();
})();
