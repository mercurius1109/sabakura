import { computed } from "vue";

export function useInventoryView({ inventory, craftQueue, gatherQueue, recipes, gatherActions, itemDefinitions }) {
  const recipeMap = Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe]));
  const gatherActionMap = Object.fromEntries(gatherActions.map((action) => [action.id, action]));

  function inventorySource() {
    return "value" in inventory ? inventory.value : inventory;
  }

  function itemName(itemId) {
    return itemDefinitions[itemId].name;
  }

  function pendingOutputs(itemId) {
    const craftPending = craftQueue.reduce((total, task) => {
      const recipe = recipeMap[task.recipeId];
      return total + (recipe?.outputs[itemId] || 0);
    }, 0);

    const gatherPending = gatherQueue.reduce((total, task) => {
      const action = gatherActionMap[task.actionId];
      if (!action || action.itemId !== itemId) {
        return total;
      }
      return total + task.amount;
    }, 0);

    return craftPending + gatherPending;
  }

  function expectedStock(itemId) {
    return (inventorySource()[itemId] || 0) + pendingOutputs(itemId);
  }

  function formatList(map) {
    return Object.entries(map)
      .map(([itemId, amount]) => `${itemName(itemId)} x${amount}`)
      .join(" / ");
  }

  const itemCards = computed(() =>
    Object.entries(itemDefinitions)
      .filter(([, meta]) => meta.kind !== "structure")
      .map(([id, meta]) => ({
        id,
        name: meta.name,
        icon: meta.icon,
        kind: meta.kind,
        nutrition: meta.nutrition || 0,
        amount: inventorySource()[id] || 0,
        expected: expectedStock(id),
      })),
  );

  const ownedKinds = computed(() => Object.values(inventorySource()).filter((amount) => amount > 0).length);

  return {
    itemCards,
    ownedKinds,
    expectedStock,
    formatList,
    itemName,
  };
}
