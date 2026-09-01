(function () {
  "use strict";

  const DATA_URL = "data/cocktails.json";

  const state = {
    cocktails: [],
    search: "",
    selectedIngredients: new Set(),
    ingredientMatchAll: false,
    category: "",
    glass: "",
    alcoholic: "",
    ingredientFilterText: "",
  };

  const els = {
    grid: document.getElementById("cocktail-grid"),
    resultsCount: document.getElementById("results-count"),
    emptyState: document.getElementById("empty-state"),
    loadError: document.getElementById("load-error"),
    searchInput: document.getElementById("search-input"),
    ingredientSearch: document.getElementById("ingredient-search"),
    ingredientList: document.getElementById("ingredient-list"),
    selectedChips: document.getElementById("selected-ingredients"),
    ingredientModeAll: document.getElementById("ingredient-mode-all"),
    categorySelect: document.getElementById("category-select"),
    glassSelect: document.getElementById("glass-select"),
    alcoholicSelect: document.getElementById("alcoholic-select"),
    resetButton: document.getElementById("reset-filters"),
    filtersToggle: document.getElementById("filters-toggle"),
    filters: document.getElementById("filters"),
    lastUpdated: document.getElementById("last-updated"),
    modalOverlay: document.getElementById("modal-overlay"),
    modalContent: document.getElementById("modal-content"),
    modalClose: document.getElementById("modal-close"),
  };

  function init() {
    fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then((data) => {
        state.cocktails = data.cocktails || [];
        populateFilterOptions(data);
        setLastUpdated(data.generated_at);
        bindEvents();
        render();
      })
      .catch((err) => {
        console.error("Kon cocktaildata niet laden:", err);
        els.loadError.hidden = false;
      });
  }

  function populateFilterOptions(data) {
    const ingredients = data.ingredients_index || [];
    renderIngredientList(ingredients);

    fillSelect(els.categorySelect, data.categories_index || []);
    fillSelect(els.glassSelect, data.glasses_index || []);
    fillSelect(els.alcoholicSelect, data.alcoholic_index || []);
  }

  function fillSelect(selectEl, values) {
    values.forEach((value) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      selectEl.appendChild(opt);
    });
  }

  function renderIngredientList(allIngredients) {
    const filterText = state.ingredientFilterText.trim().toLowerCase();
    const filtered = filterText
      ? allIngredients.filter((i) => i.toLowerCase().includes(filterText))
      : allIngredients;

    els.ingredientList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const usedIds = new Set();

    filtered.forEach((ingredient) => {
      let id = "ing-" + slugify(ingredient);
      while (usedIds.has(id)) {
        id += "-x";
      }
      usedIds.add(id);
      const wrapper = document.createElement("label");
      wrapper.className = "ingredient-item";
      wrapper.setAttribute("for", id);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = id;
      checkbox.value = ingredient;
      checkbox.checked = state.selectedIngredients.has(ingredient);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.selectedIngredients.add(ingredient);
        } else {
          state.selectedIngredients.delete(ingredient);
        }
        renderSelectedChips();
        render();
      });

      const span = document.createElement("span");
      span.textContent = ingredient;

      wrapper.appendChild(checkbox);
      wrapper.appendChild(span);
      fragment.appendChild(wrapper);
    });

    if (filtered.length === 0) {
      const none = document.createElement("p");
      none.textContent = "Geen ingrediënten gevonden.";
      none.style.fontSize = "0.85rem";
      none.style.color = "var(--color-text-muted)";
      none.style.margin = "0.2rem";
      fragment.appendChild(none);
    }

    els.ingredientList.appendChild(fragment);
  }

  function renderSelectedChips() {
    els.selectedChips.innerHTML = "";
    state.selectedIngredients.forEach((ingredient) => {
      const chip = document.createElement("span");
      chip.className = "chip";

      const label = document.createElement("span");
      label.textContent = ingredient;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "Verwijder filter " + ingredient);
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        state.selectedIngredients.delete(ingredient);
        renderIngredientList(getAllIngredientNames());
        renderSelectedChips();
        render();
      });

      chip.appendChild(label);
      chip.appendChild(removeBtn);
      els.selectedChips.appendChild(chip);
    });
  }

  function getAllIngredientNames() {
    const set = new Set();
    state.cocktails.forEach((c) =>
      (c.ingredients || []).forEach((i) => set.add(i.name))
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", (e) => {
      state.search = e.target.value;
      render();
    });

    els.ingredientSearch.addEventListener("input", (e) => {
      state.ingredientFilterText = e.target.value;
      renderIngredientList(getAllIngredientNames());
    });

    els.ingredientModeAll.addEventListener("change", (e) => {
      state.ingredientMatchAll = e.target.checked;
      render();
    });

    els.categorySelect.addEventListener("change", (e) => {
      state.category = e.target.value;
      render();
    });

    els.glassSelect.addEventListener("change", (e) => {
      state.glass = e.target.value;
      render();
    });

    els.alcoholicSelect.addEventListener("change", (e) => {
      state.alcoholic = e.target.value;
      render();
    });

    els.resetButton.addEventListener("click", () => {
      state.search = "";
      state.selectedIngredients.clear();
      state.ingredientMatchAll = false;
      state.category = "";
      state.glass = "";
      state.alcoholic = "";
      state.ingredientFilterText = "";

      els.searchInput.value = "";
      els.ingredientSearch.value = "";
      els.ingredientModeAll.checked = false;
      els.categorySelect.value = "";
      els.glassSelect.value = "";
      els.alcoholicSelect.value = "";

      renderIngredientList(getAllIngredientNames());
      renderSelectedChips();
      render();
    });

    els.filtersToggle.addEventListener("click", () => {
      const isOpen = els.filters.classList.toggle("open");
      els.filtersToggle.setAttribute("aria-expanded", String(isOpen));
    });

    els.modalClose.addEventListener("click", closeModal);
    els.modalOverlay.addEventListener("click", (e) => {
      if (e.target === els.modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  function matchesFilters(cocktail) {
    const searchTerm = state.search.trim().toLowerCase();
    if (searchTerm && !cocktail.name.toLowerCase().includes(searchTerm)) {
      return false;
    }

    if (state.category && cocktail.category !== state.category) {
      return false;
    }

    if (state.glass && cocktail.glass !== state.glass) {
      return false;
    }

    if (state.alcoholic && cocktail.alcoholic !== state.alcoholic) {
      return false;
    }

    if (state.selectedIngredients.size > 0) {
      const cocktailIngredientNames = new Set(
        (cocktail.ingredients || []).map((i) => i.name)
      );
      const selected = Array.from(state.selectedIngredients);

      if (state.ingredientMatchAll) {
        const hasAll = selected.every((ing) => cocktailIngredientNames.has(ing));
        if (!hasAll) return false;
      } else {
        const hasAny = selected.some((ing) => cocktailIngredientNames.has(ing));
        if (!hasAny) return false;
      }
    }

    return true;
  }

  function render() {
    const filtered = state.cocktails.filter(matchesFilters);

    els.resultsCount.textContent =
      filtered.length === state.cocktails.length
        ? `${filtered.length} cocktails`
        : `${filtered.length} van ${state.cocktails.length} cocktails`;

    els.grid.innerHTML = "";
    els.emptyState.hidden = filtered.length > 0;

    const fragment = document.createDocumentFragment();
    filtered.forEach((cocktail) => {
      fragment.appendChild(buildCard(cocktail));
    });
    els.grid.appendChild(fragment);
  }

  function buildCard(cocktail) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "cocktail-card";
    card.addEventListener("click", () => openModal(cocktail));

    const imageWrap = document.createElement("div");
    imageWrap.className = "card-image-wrap";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = cocktail.name;
    img.src = cocktail.image
      ? cocktail.image + "/preview"
      : "";
    img.onerror = () => {
      img.onerror = null;
      img.src = cocktail.image || "";
    };
    if (!cocktail.image) {
      imageWrap.style.display = "flex";
      imageWrap.style.alignItems = "center";
      imageWrap.style.justifyContent = "center";
      imageWrap.style.color = "var(--color-text-muted)";
      imageWrap.style.fontSize = "0.8rem";
      imageWrap.textContent = "Geen foto";
    } else {
      imageWrap.appendChild(img);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.textContent = cocktail.name;

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = [cocktail.category, cocktail.glass]
      .filter(Boolean)
      .join(" · ");

    const ingredientsPreview = document.createElement("p");
    ingredientsPreview.className = "card-ingredients";
    ingredientsPreview.textContent = (cocktail.ingredients || [])
      .map((i) => i.name)
      .join(", ");

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(ingredientsPreview);

    card.appendChild(imageWrap);
    card.appendChild(body);

    return card;
  }

  function openModal(cocktail) {
    els.modalContent.innerHTML = "";

    if (cocktail.image) {
      const img = document.createElement("img");
      img.className = "modal-image";
      img.src = cocktail.image;
      img.alt = cocktail.name;
      els.modalContent.appendChild(img);
    }

    const title = document.createElement("h2");
    title.id = "modal-title";
    title.textContent = cocktail.name;
    els.modalContent.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "modal-meta";
    meta.textContent = [cocktail.category, cocktail.glass, cocktail.alcoholic]
      .filter(Boolean)
      .join(" · ");
    els.modalContent.appendChild(meta);

    const ingredientsHeading = document.createElement("h4");
    ingredientsHeading.textContent = "Ingrediënten";
    els.modalContent.appendChild(ingredientsHeading);

    const list = document.createElement("ul");
    (cocktail.ingredients || []).forEach((ing) => {
      const li = document.createElement("li");
      li.textContent = ing.measure ? `${ing.measure} ${ing.name}` : ing.name;
      list.appendChild(li);
    });
    els.modalContent.appendChild(list);

    if (cocktail.instructions) {
      const instructionsHeading = document.createElement("h4");
      instructionsHeading.textContent = "Bereiding";
      els.modalContent.appendChild(instructionsHeading);

      const instructions = document.createElement("p");
      instructions.className = "instructions";
      instructions.textContent = cocktail.instructions;
      els.modalContent.appendChild(instructions);
    }

    els.modalOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    els.modalClose.focus();
  }

  function closeModal() {
    els.modalOverlay.hidden = true;
    document.body.style.overflow = "";
  }

  function setLastUpdated(generatedAt) {
    if (!generatedAt) {
      els.lastUpdated.textContent = "";
      return;
    }
    const date = new Date(generatedAt);
    const formatted = date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    els.lastUpdated.textContent = `Data laatst bijgewerkt op ${formatted}`;
  }

  init();
})();
