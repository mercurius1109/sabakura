<template>
  <section class="grid content-start gap-4">
    <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
        <h2 class="font-bold">手作業</h2>
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
          {{ isPlayerBusy ? "作業中" : "待機中" }}
        </span>
      </div>

      <div class="grid gap-3 p-4">
        <div v-for="recipe in playerRecipes" :key="recipe.id" class="rounded-md border border-line bg-[#fffdf8] p-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-bold">{{ recipe.name }}</h3>
              <p class="mt-1 text-xs text-muted">{{ (recipe.duration / 1000).toFixed(1) }}秒 / {{ formatList(recipe.outputs) }}</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="canStartPlayerRecipe(recipe) ? 'bg-emerald-100 text-moss' : 'bg-orange-100 text-ambered'">
              {{ canStartPlayerRecipe(recipe) ? "開始可能" : "条件不足" }}
            </span>
          </div>

          <div class="mt-2 text-xs text-muted">{{ formatList(recipe.costs) }}</div>

          <button
            type="button"
            class="mt-3 w-full rounded-md px-4 py-2.5 font-bold text-white transition"
            :class="canStartPlayerRecipe(recipe) ? 'bg-leaf hover:bg-moss' : 'cursor-not-allowed bg-stone-400'"
            :disabled="!canStartPlayerRecipe(recipe)"
            @click="$emit('start-player-craft', recipe.id)"
          >
            プレイヤーが作業する
          </button>
        </div>
      </div>
    </article>

    <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
        <h2 class="font-bold">採集</h2>
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">村人作業</span>
      </div>

      <div class="grid gap-3 p-4">
        <div
          v-for="action in gatherActions"
          :key="action.id"
          class="rounded-md border border-line bg-[#fffdf8] p-3 transition-opacity"
          :class="isGatherUnlocked(action) ? 'opacity-100' : 'opacity-55'"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-bold">{{ action.label }}</h3>
              <p class="mt-1 text-xs text-muted">{{ (action.duration / 1000).toFixed(1) }}秒 / {{ action.amount }}個</p>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="isGatherUnlocked(action) ? 'bg-emerald-100 text-moss' : 'bg-orange-100 text-ambered'">
              {{ isGatherUnlocked(action) ? "割当可能" : "未解放" }}
            </span>
          </div>

          <div class="mt-2 text-xs text-muted">空き村人 {{ availableGatherVillagers }}人</div>

          <button
            type="button"
            class="mt-3 w-full rounded-md px-4 py-2.5 font-bold text-white transition"
            :class="canStartGather(action) ? 'bg-leaf hover:bg-moss' : 'cursor-not-allowed bg-stone-400'"
            :disabled="!canStartGather(action)"
            @click="$emit('start-gather', action.id)"
          >
            村人に採集させる
          </button>
        </div>
      </div>

      <div class="border-t border-line bg-white p-4">
        <h3 class="text-sm font-bold">採集中の進捗</h3>
        <div v-if="gatherQueue.length === 0" class="mt-2 text-sm text-muted">
          進行中の採集はありません。
        </div>
        <div v-for="task in gatherQueue" :key="task.id" class="mt-3 grid gap-1.5 rounded-md border border-line bg-[#fffdf8] p-3">
          <div class="flex items-center justify-between gap-2 text-sm font-bold">
            <span>{{ gatherActionById(task.actionId).label }}</span>
            <span class="text-xs text-muted">{{ villagerName(task.villagerId) }}</span>
          </div>
          <div class="flex justify-between text-xs text-muted">
            <span>{{ taskProgress(task) }}%</span>
            <span>残り {{ remainingSeconds(task) }}秒</span>
          </div>
          <div class="h-2.5 overflow-hidden rounded-full border border-[#c7bdad] bg-[#eee7dd]">
            <div class="h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]" :style="{ width: `${taskProgress(task)}%` }"></div>
          </div>
        </div>
      </div>
    </article>

    <InventoryGrid :item-cards="itemCards" :owned-kinds="ownedKinds" />

    <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
        <h2 class="font-bold">設備</h2>
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ availableStations.length }} / {{ stations.length }}</span>
      </div>
      <div class="grid gap-2 p-4">
        <StationCard
          v-for="station in stations"
          :key="station.id"
          :station="station"
          :is-available="isStationAvailable(station.id)"
          :assigned-villagers="assignedVillagerList(station.id)"
          :available-villagers="unassignedVillagersForStation(station.id)"
          :tasks="stationTasks(station.id)"
          :recipes="stationRecipes(station.id)"
          :craft-entries="stationCraftEntries(station.id)"
          :current-amount="(craftEntryId) => craftEntryItemId(station.id, craftEntryId) ? inventory[craftEntryItemId(station.id, craftEntryId)] : 0"
          :expected-amount="(craftEntryId) => craftEntryItemId(station.id, craftEntryId) ? expectedStock(craftEntryItemId(station.id, craftEntryId)) : 0"
          :craft-entry-status="(craftEntryId) => craftEntryStatus(station.id, craftEntryId)"
          :can-start-entry="(craftEntryId) => canStartStationCraftEntry(station.id, craftEntryId)"
          :recipe-by-id="recipeById"
          :villager-name="villagerName"
          :task-progress="taskProgress"
          :remaining-seconds="remainingSeconds"
          :format-list="formatList"
          @add-villager="onAddStationVillager"
          @remove-villager="onRemoveStationVillager"
          @add-craft-entry="onAddCraftEntry"
          @remove-craft-entry="onRemoveCraftEntry"
          @update-craft-entry-target="onUpdateCraftEntryTarget"
          @start-craft-entry="onStartStationCraftEntry"
        />
      </div>
    </article>

    <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
        <h2 class="font-bold">村人</h2>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ villagers.length }}人</span>
          <button class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white" type="button" @click="$emit('add-villager')">
            追加
          </button>
        </div>
      </div>
      <div class="grid gap-3 p-4">
        <div v-for="villager in villagers" :key="villager.id" class="rounded-md border border-line bg-[#fffdf8] p-3">
          <div class="flex items-center justify-between gap-2 font-bold">
            <span>{{ villager.name }}</span>
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="villager.taskId ? 'bg-orange-100 text-ambered' : 'bg-emerald-100 text-moss'">
              {{ villager.taskId ? "作業中" : "待機中" }}
            </span>
          </div>
          <p class="mt-2 text-sm leading-6 text-muted">{{ villagerNote(villager) }}</p>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup>
import InventoryGrid from "./InventoryGrid.vue";
import StationCard from "./StationCard.vue";

const props = defineProps({
  itemCards: { type: Array, required: true },
  ownedKinds: { type: Number, required: true },
  playerRecipes: { type: Array, required: true },
  canStartPlayerRecipe: { type: Function, required: true },
  isPlayerBusy: { type: Boolean, required: true },
  gatherActions: { type: Array, required: true },
  gatherQueue: { type: Array, required: true },
  canStartGather: { type: Function, required: true },
  isGatherUnlocked: { type: Function, required: true },
  gatherActionById: { type: Function, required: true },
  availableGatherVillagers: { type: Number, required: true },
  stations: { type: Array, required: true },
  availableStations: { type: Array, required: true },
  isStationAvailable: { type: Function, required: true },
  assignedVillagerList: { type: Function, required: true },
  unassignedVillagersForStation: { type: Function, required: true },
  stationTasks: { type: Function, required: true },
  stationRecipes: { type: Function, required: true },
  stationCraftEntries: { type: Function, required: true },
  canStartStationCraftEntry: { type: Function, required: true },
  craftEntryItemId: { type: Function, required: true },
  craftEntryStatus: { type: Function, required: true },
  inventory: { type: Object, required: true },
  expectedStock: { type: Function, required: true },
  recipeById: { type: Function, required: true },
  villagerName: { type: Function, required: true },
  taskProgress: { type: Function, required: true },
  remainingSeconds: { type: Function, required: true },
  formatList: { type: Function, required: true },
  villagers: { type: Array, required: true },
  villagerNote: { type: Function, required: true },
});

const emit = defineEmits([
  "start-player-craft",
  "start-gather",
  "add-station-villager",
  "remove-station-villager",
  "add-station-craft-entry",
  "remove-station-craft-entry",
  "update-station-craft-entry-target",
  "start-station-craft-entry",
  "add-villager",
]);

function onAddStationVillager(...args) {
  emit("add-station-villager", ...args);
}

function onRemoveStationVillager(...args) {
  emit("remove-station-villager", ...args);
}

function onAddCraftEntry(...args) {
  emit("add-station-craft-entry", ...args);
}

function onRemoveCraftEntry(...args) {
  emit("remove-station-craft-entry", ...args);
}

function onUpdateCraftEntryTarget(...args) {
  emit("update-station-craft-entry-target", ...args);
}

function onStartStationCraftEntry(...args) {
  emit("start-station-craft-entry", ...args);
}
</script>
