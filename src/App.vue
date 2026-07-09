<template>
  <div class="h-screen overflow-hidden">
    <main class="h-full">
      <section class="relative h-full">
        <GameField
          :resource-nodes="visibleFieldNodes()"
          :player="playerActor"
          :villagers="villagers"
          :construction-sites="constructionSitesForField"
          :placed-structures="placedStructures"
          :item-definitions="itemDefinitions"
          :tutorial-targets="currentTutorialTargets"
          @select-resource="pickupResourceNode"
          @select-workbench="openWorkbenchWindow"
          @select-lumberjack-hut="openLumberjackHutWindow"
          @select-storage="openStorageCompareWindow"
          @select-construction="handleConstructionSiteClick"
          @select-player="openPlayerWindow"
          @select-villager="openVillagerCompareWindow"
        />

        <div class="absolute left-4 top-4 z-10 flex gap-3">
          <button
            type="button"
            class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
            :class="hasTutorialTarget('menu', 'village') ? tutorialHighlightClass : ''"
            @click="openVillageWindow"
          >
            <span aria-hidden="true" class="text-2xl leading-none">👥</span>
            <span class="text-xs font-bold text-ink">Villagers</span>
          </button>
          <button
            type="button"
            class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
            :class="hasTutorialTarget('menu', 'build') ? tutorialHighlightClass : ''"
            @click="openBuildWindow"
          >
            <span aria-hidden="true" class="text-2xl leading-none">🏗</span>
            <span class="text-xs font-bold text-ink">Build</span>
          </button>
          <div class="flex items-center gap-2 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 shadow-panel backdrop-blur">
            <span class="text-xs font-bold text-ink">Speed</span>
            <button
              v-for="speed in gameSpeedOptions"
              :key="speed"
              type="button"
              class="rounded-full px-2 py-1 text-xs font-bold transition"
              :class="gameSpeed === speed ? 'bg-moss text-white' : 'bg-white/80 text-ink hover:bg-white'"
              @click="setGameSpeed(speed)"
            >
              x{{ speed }}
            </button>
          </div>
        </div>

        <div class="absolute right-4 top-4 z-10">
          <TutorialPanel
            :current-step="currentTutorialStep"
            :completed-count="completedTutorialSteps"
            :total-steps="totalTutorialSteps"
            :is-complete="isTutorialComplete"
          />
        </div>

        <div class="absolute bottom-4 right-4 z-10 w-[340px] max-w-[calc(100vw-2rem)] rounded-[26px] border border-white/40 bg-black/28 p-4 text-white shadow-panel backdrop-blur">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-bold tracking-[0.18em] text-white/80">LOG</div>
            <button type="button" class="text-xs font-bold text-white/80 transition hover:text-white" @click="clearLog">Clear</button>
          </div>
          <div class="mt-3 max-h-[280px] overflow-auto pr-1">
            <div v-if="log.length === 0" class="text-sm text-white/70">No logs yet.</div>
            <div v-for="entry in log" :key="entry.id" class="py-1 text-sm leading-6 text-white/90">
              {{ entry.text }}
            </div>
          </div>
        </div>

        <div
          v-if="selectedWindow"
          class="absolute left-1/2 top-1/2 z-20 max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2"
          :class="isCompareWindow ? 'w-[min(96vw,1080px)]' : 'w-[min(92vw,560px)]'"
        >
          <div
            class="overflow-hidden rounded-[30px] border border-white/60 bg-[#fbf8f1]/96 shadow-[0_24px_60px_rgba(36,35,31,0.24)] backdrop-blur"
            :class="isCompareWindow ? 'grid gap-px bg-line md:grid-cols-2' : ''"
          >
            <template v-if="isStorageCompareWindow">
              <div class="bg-[#fbf8f1]">
                <WindowHeader eyebrow="PLAYER" :title="playerActor.name" description="Click an item to move it into the container." @close="closeWindow" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryActionGrid
                    caption="Player Inventory"
                    empty-text="No items."
                    :entries="playerTransferOutEntries"
                    :disabled="!isPlayerAdjacentToStorage"
                    disabled-text="Move next to the storage to transfer items."
                    @select="transferPlayerItemToStorage"
                  />
                  <TaskPanel class="mt-4" :task="currentPlayerTask" :task-label="taskLabel" :task-progress="taskProgress" :remaining-seconds="remainingSeconds" />
                </div>
              </div>

              <div class="bg-[#f7f2e7]">
                <WindowHeader eyebrow="CONTAINER" :title="storageTitle" description="Click an item to move it into the player inventory." :show-close="false" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryActionGrid
                    caption="Container"
                    empty-text="Container is empty."
                    :entries="storageTransferEntries"
                    :disabled="!isPlayerAdjacentToStorage"
                    disabled-text="Move next to the storage to transfer items."
                    @select="transferStorageItemToPlayer"
                  />

                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    <div
                      v-for="rule in stockRules"
                      :key="rule.id"
                      class="rounded-2xl border border-line bg-white/80 p-3"
                      :class="hasTutorialTarget('storage-rule', rule.itemId) ? tutorialHighlightClass : ''"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <div>
                          <div class="font-bold text-ink">{{ itemDefinitions[rule.itemId].name }}</div>
                          <div class="mt-1 text-xs text-muted">{{ stockRuleSourceLabel(rule) }}</div>
                        </div>
                        <label class="flex items-center gap-2 text-sm font-bold text-moss">
                          <input v-model="rule.enabled" type="checkbox" class="h-4 w-4 accent-[#2d6a4f]" @change="onRuleChanged(rule)">
                          On
                        </label>
                      </div>
                      <label class="mt-3 grid gap-1 text-xs font-bold text-muted">
                        Target
                        <input
                          v-model.number="rule.target"
                          type="number"
                          min="0"
                          class="rounded-xl border border-line bg-white px-3 py-2 text-base font-bold text-ink"
                          @change="onRuleChanged(rule)"
                        >
                      </label>
                      <div class="mt-2 rounded-xl border border-line bg-[#faf8f3] px-3 py-2 text-sm leading-6 text-muted">
                        Stock {{ inventory[rule.itemId] }} / Expected {{ expectedStock(rule.itemId) }} / {{ stockRuleStatus(rule) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="isVillagerCompareWindow && selectedVillager">
              <div class="bg-[#fbf8f1]">
                <WindowHeader eyebrow="PLAYER" :title="playerActor.name" description="Player status and inventory." @close="closeWindow" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryActionGrid
                    caption="Player Inventory"
                    empty-text="No items."
                    :entries="playerTransferOutEntries"
                    :disabled="!isPlayerAdjacentToSelectedVillager"
                    disabled-text="Move next to the villager to transfer items."
                    @select="transferPlayerItemToVillager"
                  />
                  <TaskPanel class="mt-4" :task="currentPlayerTask" :task-label="taskLabel" :task-progress="taskProgress" :remaining-seconds="remainingSeconds" />

                  <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-sm font-bold text-ink">Hand Craft</div>
                      <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
                        {{ isPlayerBusy ? "Busy" : "Ready" }}
                      </span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <button
                        v-for="recipe in playerRecipes"
                        :key="recipe.id"
                        :title="playerCraftTooltip(recipe)"
                        type="button"
                        class="flex h-10 w-10 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition"
                        :class="playerRecipeButtonClass(recipe)"
                        :disabled="!canStartPlayerRecipe(recipe)"
                        @click="startPlayerCraft(recipe.id)"
                      >
                        <span class="text-xl leading-none" aria-hidden="true">{{ playerCraftIcon(recipe) }}</span>
                        <span class="sr-only">{{ recipe.name }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-[#f7f2e7]">
                <WindowHeader eyebrow="VILLAGER" :title="selectedVillager.name" description="Villager inventory, assignments, and task." :show-close="false" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryActionGrid
                    caption="Villager Inventory"
                    empty-text="No items."
                    :entries="selectedVillagerTransferOutEntries"
                    :disabled="!isPlayerAdjacentToSelectedVillager"
                    disabled-text="Move next to the villager to transfer items."
                    @select="transferVillagerItemToPlayer"
                  />

                  <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                    <div class="text-sm font-bold text-ink">Assigned Stations</div>
                    <div v-if="selectedVillagerStations.length === 0" class="mt-3 text-sm text-muted">No assigned stations.</div>
                    <div v-else class="mt-3 grid gap-2">
                      <div
                        v-for="station in selectedVillagerStations"
                        :key="station.id"
                        class="rounded-xl border border-line bg-[#faf8f3] px-3 py-3 text-sm font-bold text-ink"
                      >
                        {{ station.name }}
                      </div>
                    </div>
                  </div>

                  <TaskPanel
                    class="mt-4"
                    :task="currentSelectedVillagerTask"
                    :task-label="taskLabel"
                    :task-progress="taskProgress"
                    :remaining-seconds="remainingSeconds"
                  />
                </div>
              </div>
            </template>

            <template v-else>
              <div class="bg-[#fbf8f1]">
                <template v-if="selectedWindow.type === 'player'">
                  <WindowHeader eyebrow="PLAYER" :title="playerActor.name" description="Player inventory and current task." @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <InventoryGrid :item-cards="playerItemCards" :owned-kinds="playerOwnedKinds" />

                    <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                      <InventoryActionGrid
                        caption="Drop Item"
                        empty-text="No items."
                        :entries="playerTransferOutEntries"
                        @select="dropPlayerInventoryItem"
                      />
                    </div>

                    <TaskPanel class="mt-4" :task="currentPlayerTask" :task-label="taskLabel" :task-progress="taskProgress" :remaining-seconds="remainingSeconds" />

                    <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                      <div class="flex items-center justify-between gap-2">
                        <div class="text-sm font-bold text-ink">Hand Craft</div>
                        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
                          {{ isPlayerBusy ? "Busy" : "Ready" }}
                        </span>
                      </div>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <button
                          v-for="recipe in playerRecipes"
                          :key="recipe.id"
                          :title="playerCraftTooltip(recipe)"
                          type="button"
                          class="flex h-10 w-10 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition"
                          :class="playerRecipeButtonClass(recipe)"
                          :disabled="!canStartPlayerRecipe(recipe)"
                          @click="startPlayerCraft(recipe.id)"
                        >
                          <span class="text-xl leading-none" aria-hidden="true">{{ playerCraftIcon(recipe) }}</span>
                          <span class="sr-only">{{ recipe.name }}</span>
                        </button>
                      </div>
                    </div>

                    <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                      <div class="flex items-center justify-between gap-2">
                        <div class="text-sm font-bold text-ink">Build</div>
                        <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-muted">
                          {{ playerBuildCards.length }} options
                        </span>
                      </div>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <button
                          v-for="building in playerBuildCards"
                          :key="building.id"
                          :title="playerBuildTooltip(building)"
                          type="button"
                          class="flex h-10 w-10 items-center justify-center rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition"
                          :class="playerBuildButtonClass(building)"
                          :disabled="!canPlaceStructure(building.id)"
                          @click="placeStructure(building.id)"
                        >
                          <span class="text-xl leading-none" aria-hidden="true">{{ building.icon }}</span>
                          <span class="sr-only">{{ building.name }}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else-if="selectedWindow.type === 'village'">
                  <WindowHeader eyebrow="VILLAGERS" title="Villager Management" description="Add villagers and inspect their state." @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <button
                      type="button"
                      class="rounded-2xl border border-line bg-white px-4 py-2 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
                      :class="hasTutorialTarget('village-action', 'add-villager') ? tutorialHighlightClass : ''"
                      @click="addVillager"
                    >
                      Add Villager
                    </button>
                    <div class="mt-4 grid gap-3">
                      <button
                        v-for="villager in villagers"
                        :key="villager.id"
                        type="button"
                        class="rounded-2xl border border-line bg-white/85 px-4 py-3 text-left transition hover:-translate-y-0.5"
                        @click="openVillagerCompareWindow(villager.id)"
                      >
                        <div class="flex items-center justify-between gap-2">
                          <span class="font-bold text-ink">{{ villager.name }}</span>
                          <span class="rounded-full px-3 py-1 text-xs font-bold" :class="villager.taskId ? 'bg-orange-100 text-ambered' : 'bg-emerald-100 text-moss'">
                            {{ villager.taskId ? "Busy" : "Idle" }}
                          </span>
                        </div>
                        <div class="mt-2 text-xs leading-6 text-muted">{{ villagerNote(villager) }}</div>
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else-if="selectedWindow.type === 'build'">
                  <WindowHeader eyebrow="BUILD" title="Construction" description="Consume player inventory items to place a construction site." @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <div class="grid gap-2">
                      <button
                        v-for="building in playerBuildCards"
                        :key="building.id"
                        type="button"
                        class="rounded-2xl border px-4 py-3 text-left transition"
                        :class="buildMenuButtonClass(building)"
                        :disabled="!canPlaceStructure(building.id)"
                        @click="placeStructure(building.id)"
                      >
                        <div class="font-bold text-ink">{{ building.name }}</div>
                        <div class="mt-1 text-xs text-muted">{{ formatList(building.costs) }} / {{ buildingStatus(building.id) }}</div>
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else-if="selectedWindow.type === 'workbench' && workbenchStation">
                  <WindowHeader eyebrow="FACILITY" :title="workbenchStation.name" description="Assign villagers and configure recipes." @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <StationCard
                      :station="workbenchStation"
                      :is-available="isStationAvailable('workbench')"
                      :assigned-villagers="assignedVillagerList('workbench')"
                      :available-villagers="unassignedVillagersForStation('workbench')"
                      :tasks="stationTasks('workbench')"
                      :recipes="stationRecipes('workbench')"
                      :craft-entries="stationCraftEntries('workbench')"
                      :current-amount="(craftEntryId) => stationTargetItemId('workbench', craftEntryId) ? inventory[stationTargetItemId('workbench', craftEntryId)] : 0"
                      :expected-amount="(craftEntryId) => stationTargetItemId('workbench', craftEntryId) ? expectedStock(stationTargetItemId('workbench', craftEntryId)) : 0"
                      :craft-entry-status="(craftEntryId) => craftEntryStatus('workbench', craftEntryId)"
                      :can-start-entry="(craftEntryId) => canStartStationCraftEntry('workbench', craftEntryId)"
                      :recipe-by-id="recipeById"
                      :task-label="taskLabel"
                      :villager-name="villagerName"
                      :task-progress="taskProgress"
                      :remaining-seconds="remainingSeconds"
                      :format-list="formatList"
                      :highlight-add-villager="hasTutorialTarget('station-action', 'workbench:add-villager')"
                      :highlight-add-craft="hasTutorialTarget('station-action', 'workbench:add-craft')"
                      @add-villager="addVillagerToStation"
                      @remove-villager="removeVillagerFromStation"
                      @add-craft-entry="addStationCraftEntry"
                      @remove-craft-entry="removeStationCraftEntry"
                      @update-craft-entry-target="updateStationCraftEntryTarget"
                      @start-craft-entry="startStationCraftEntry"
                    />
                  </div>
                </template>

                <template v-else-if="selectedWindow.type === 'lumberjackHut' && lumberjackHutStation">
                  <WindowHeader eyebrow="FACILITY" :title="lumberjackHutStation.name" description="Assign villagers and inspect tasks." @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <StationCard
                      :station="lumberjackHutStation"
                      :is-available="isStationAvailable('lumberjackHut')"
                      :assigned-villagers="assignedVillagerList('lumberjackHut')"
                      :available-villagers="unassignedVillagersForStation('lumberjackHut')"
                      :tasks="stationTasks('lumberjackHut')"
                      :recipes="stationRecipes('lumberjackHut')"
                      :craft-entries="stationCraftEntries('lumberjackHut')"
                      :current-amount="() => 0"
                      :expected-amount="() => 0"
                      :craft-entry-status="() => ''"
                      :can-start-entry="() => false"
                      :recipe-by-id="recipeById"
                      :task-label="taskLabel"
                      :villager-name="villagerName"
                      :task-progress="taskProgress"
                      :remaining-seconds="remainingSeconds"
                      :format-list="formatList"
                      :highlight-add-villager="hasTutorialTarget('station-action', 'lumberjackHut:add-villager')"
                      :highlight-add-craft="hasTutorialTarget('station-action', 'lumberjackHut:add-craft')"
                      @add-villager="addVillagerToStation"
                      @remove-villager="removeVillagerFromStation"
                      @add-craft-entry="addStationCraftEntry"
                      @remove-craft-entry="removeStationCraftEntry"
                      @update-craft-entry-target="updateStationCraftEntryTarget"
                      @start-craft-entry="startStationCraftEntry"
                    />
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, ref } from "vue";
import GameField from "./components/GameField.vue";
import InventoryGrid from "./components/InventoryGrid.vue";
import StationCard from "./components/StationCard.vue";
import TutorialPanel from "./components/TutorialPanel.vue";
import { useSurvivalCraft } from "./composables/useSurvivalCraft.js";
import { useTutorial } from "./composables/useTutorial.js";

const selectedWindow = ref(null);

const {
  itemDefinitions,
  inventory,
  storage,
  placedStructures,
  constructionSites,
  constructionQueue,
  craftQueue,
  gatherQueue,
  playerActor,
  visibleFieldNodes,
  pickupFieldNode,
  placeStructure,
  canPlaceStructure,
  canStartPlayerRecipe,
  buildingStatus,
  villagers,
  playerRecipes,
  isPlayerBusy,
  log,
  stockRules,
  expectedStock,
  isStationAvailable,
  assignedVillagerList,
  unassignedVillagersForStation,
  stationTasks,
  stationRecipes,
  stationCraftEntries,
  canStartStationCraftEntry,
  addStationCraftEntry,
  removeStationCraftEntry,
  updateStationCraftEntryTarget,
  stationTargetItemId,
  craftEntryStatus,
  villagerNote,
  addVillagerToStation,
  removeVillagerFromStation,
  addVillager,
  onRuleChanged,
  startPlayerCraft,
  startPlayerConstruction,
  startStationCraftEntry,
  recipeById,
  buildingById,
  taskLabel,
  stationName,
  stockRuleSourceLabel,
  villagerName,
  taskProgress,
  remainingSeconds,
  gameSpeed,
  setGameSpeed,
  isPlayerAdjacentToStorage,
  isPlayerAdjacentToActor,
  approachTransferTarget,
  moveItemFromActorToStorage,
  moveItemFromStorageToActor,
  moveItemFromActorToActor,
  moveItemFromOtherActorToPlayer,
  dropPlayerItem,
  clearLog,
  formatList,
  stockRuleStatus,
  stations,
} = useSurvivalCraft();

const gameSpeedOptions = [0.1, 1, 10];

const {
  currentStep: currentTutorialStep,
  completedCount: completedTutorialSteps,
  totalSteps: totalTutorialSteps,
  isTutorialComplete,
} = useTutorial({
  playerActor,
  villagers,
  placedStructures,
  constructionSites,
  recipeById,
  buildingById,
  stationById: (stationId) => stations.find((station) => station.id === stationId) || null,
  assignedVillagerList,
  stationCraftEntries,
  stockRules,
  itemDefinitions,
});

const tutorialHighlightClass = "scale-105 ring-4 ring-[#f3c84b] ring-offset-2 ring-offset-white shadow-[0_0_24px_rgba(243,200,75,0.85)]";
const currentTutorialTargets = computed(() => currentTutorialStep.value?.highlightTargets || []);

const WindowHeader = defineComponent({
  props: {
    eyebrow: { type: String, default: "" },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    showClose: { type: Boolean, default: true },
  },
  emits: ["close"],
  setup(props, { emit }) {
    return () => h("div", { class: "flex items-start justify-between gap-4 border-b border-line/70 px-4 py-4" }, [
      h("div", { class: "min-w-0 pr-2" }, [
        props.eyebrow ? h("div", { class: "text-xs font-bold uppercase tracking-[0.24em] text-moss" }, props.eyebrow) : null,
        h("h2", { class: "mt-2 text-3xl font-bold text-ink" }, props.title),
        props.description ? h("p", { class: "mt-2 text-sm leading-6 text-muted" }, props.description) : null,
      ]),
      props.showClose
        ? h("button", {
          type: "button",
          class: "shrink-0 rounded-full border border-line bg-white px-3 py-1 text-sm font-bold text-muted transition hover:text-ink",
          onClick: () => emit("close"),
        }, "Close")
        : null,
    ]);
  },
});

const InventoryActionGrid = defineComponent({
  props: {
    caption: { type: String, required: true },
    emptyText: { type: String, required: true },
    entries: { type: Array, required: true },
    disabled: { type: Boolean, default: false },
    disabledText: { type: String, default: "" },
  },
  emits: ["select"],
  setup(props, { emit }) {
    return () => h("section", [
      h("div", { class: "mb-3 text-sm font-bold tracking-[0.08em] text-ink" }, props.caption),
      props.entries.length === 0
        ? h("div", { class: "text-sm text-muted" }, props.emptyText)
        : h("div", { class: "grid grid-cols-[repeat(auto-fill,minmax(40px,40px))] gap-2" },
          props.entries.map((entry) =>
            h("button", {
              key: entry.id,
              type: "button",
              title: `${entry.name} x${entry.amount}`,
              disabled: props.disabled,
              class: props.disabled
                ? "flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-md border border-[#d6ccb8] bg-[#f3ecdf] opacity-50"
                : "flex h-10 w-10 items-center justify-center rounded-md border border-[#d6ccb8] bg-[#f3ecdf] transition hover:-translate-y-0.5",
              onClick: () => {
                if (!props.disabled) {
                  emit("select", entry.id);
                }
              },
            }, [
              h("span", { class: "text-xl leading-none", "aria-hidden": "true" }, entry.icon),
              h("span", { class: "sr-only" }, entry.name),
            ]),
          ),
        ),
      props.disabled && props.entries.length > 0 && props.disabledText
        ? h("div", { class: "mt-3 text-sm text-muted" }, props.disabledText)
        : null,
    ]);
  },
});

const TaskPanel = defineComponent({
  props: {
    task: { type: Object, default: null },
    taskLabel: { type: Function, required: true },
    taskProgress: { type: Function, required: true },
    remainingSeconds: { type: Function, required: true },
  },
  setup(props) {
    return () => h("div", { class: "rounded-2xl border border-line bg-white/80 p-4" }, [
      h("div", { class: "flex items-center justify-between gap-2" }, [
        h("div", { class: "text-sm font-bold text-ink" }, "Current Task"),
        h("span", { class: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss" }, props.task ? phaseText(props.task.phase) : "Idle"),
      ]),
      props.task
        ? h("div", { class: "mt-3 rounded-xl border border-line bg-[#faf8f3] px-3 py-3" }, [
          h("div", { class: "flex items-center justify-between gap-2 text-sm font-bold text-ink" }, [
            h("span", props.taskLabel(props.task)),
            h("span", { class: "text-xs text-muted" }, `Left ${props.remainingSeconds(props.task)}s`),
          ]),
          h("div", { class: "mt-2 h-2.5 overflow-hidden rounded-full border border-[#c7bdad] bg-[#eee7dd]" }, [
            h("div", {
              class: "h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]",
              style: { width: `${props.taskProgress(props.task)}%` },
            }),
          ]),
        ])
        : h("div", { class: "mt-3 text-sm text-muted" }, "No active task."),
    ]);
  },
});

const workbenchStation = computed(() => stations.find((station) => station.id === "workbench") || null);
const lumberjackHutStation = computed(() => stations.find((station) => station.id === "lumberjackHut") || null);

const constructionSitesForField = computed(() =>
  constructionSites.map((site) => {
    const task = constructionQueue.find((entry) => entry.structureId === site.structureId);
    return {
      ...site,
      progress: task ? taskProgress(task) : 0,
    };
  }),
);

const isCompareWindow = computed(() =>
  selectedWindow.value?.type === "storage-compare" || selectedWindow.value?.type === "villager-compare",
);

const isStorageCompareWindow = computed(() => selectedWindow.value?.type === "storage-compare");
const isVillagerCompareWindow = computed(() => selectedWindow.value?.type === "villager-compare");

const selectedVillager = computed(() => {
  if (selectedWindow.value?.type !== "villager-compare") {
    return null;
  }
  return villagers.find((villager) => villager.id === selectedWindow.value.id) || null;
});

const playerItemCards = computed(() => itemCardsFromStore(playerActor.inventory));
const selectedVillagerItemCards = computed(() => itemCardsFromStore(selectedVillager.value?.inventory || null));
const playerOwnedKinds = computed(() => ownedKindsFromStore(playerActor.inventory));
const selectedVillagerOwnedKinds = computed(() => ownedKindsFromStore(selectedVillager.value?.inventory || null));

const playerTransferOutEntries = computed(() => actionableEntries(playerActor.inventory));
const storageTransferEntries = computed(() => actionableEntries(storage));
const selectedVillagerTransferOutEntries = computed(() => actionableEntries(selectedVillager.value?.inventory || null));
const isPlayerAdjacentToSelectedVillager = computed(() => (
  selectedVillager.value ? isPlayerAdjacentToActor(selectedVillager.value) : false
));

const selectedVillagerStations = computed(() => {
  if (!selectedVillager.value) {
    return [];
  }

  return selectedVillager.value.assignedStations.map((id) => ({
    id,
    name: stationName(id),
  }));
});

const currentPlayerTask = computed(() => taskForActor(playerActor.id));
const currentSelectedVillagerTask = computed(() => taskForActor(selectedVillager.value?.id || null));

const playerBuildCards = computed(() => [
  {
    id: "workbench",
    name: itemDefinitions.workbench?.name || "Workbench",
    icon: itemDefinitions.workbench?.icon || "?",
    costs: { wood: 4 },
  },
  {
    id: "storage",
    name: itemDefinitions.storage?.name || "Storage",
    icon: itemDefinitions.storage?.icon || "?",
    costs: { wood: 6, stone: 2 },
  },
  {
    id: "lumberjackHut",
    name: itemDefinitions.lumberjackHut?.name || "Lumberjack Hut",
    icon: itemDefinitions.lumberjackHut?.icon || "?",
    costs: { wood: 8, stone: 4 },
  },
]);

const storageTitle = computed(() => (placedStructures.storage ? "Storage" : "Ground Items"));

function itemCardsFromStore(store) {
  if (!store) {
    return [];
  }

  return Object.entries(itemDefinitions)
    .filter(([, meta]) => meta.kind !== "structure")
    .map(([id, meta]) => ({
      id,
      name: meta.name,
      icon: meta.icon,
      amount: store[id] || 0,
      expected: store[id] || 0,
    }));
}

function ownedKindsFromStore(store) {
  if (!store) {
    return 0;
  }
  return Object.values(store).filter((amount) => amount > 0).length;
}

function actionableEntries(store) {
  return itemCardsFromStore(store).filter((item) => item.amount > 0);
}

function taskForActor(actorId) {
  if (!actorId) {
    return null;
  }

  return [...gatherQueue, ...craftQueue, ...constructionQueue].find((task) => {
    if (task.villagerId === actorId) {
      return true;
    }
    return task.workerType === "self" && actorId === playerActor.id;
  }) || null;
}

function phaseText(phase) {
  if (phase === "movingToTarget") {
    return "Moving";
  }
  if (phase === "working") {
    return "Working";
  }
  if (phase === "movingToStorage") {
    return "Delivering";
  }
  return "Idle";
}

function playerCraftOutputItem(recipe) {
  const outputItemId = Object.keys(recipe.outputs || {})[0];
  return outputItemId ? itemDefinitions[outputItemId] : null;
}

function playerCraftIcon(recipe) {
  return playerCraftOutputItem(recipe)?.icon || "?";
}

function playerCraftTooltip(recipe) {
  const outputItem = playerCraftOutputItem(recipe);
  const outputName = outputItem?.name || recipe.name;
  return `${outputName}\n${formatList(recipe.costs)}`;
}

function playerBuildTooltip(building) {
  return `${building.name}\n${formatList(building.costs)}\n${buildingStatus(building.id)}`;
}

function hasTutorialTarget(kind, id) {
  return currentTutorialTargets.value.some((target) => target.kind === kind && target.id === id);
}

function playerRecipeButtonClass(recipe) {
  const base = canStartPlayerRecipe(recipe)
    ? "border-[#b2c79a] bg-white/90 hover:-translate-y-0.5"
    : "cursor-not-allowed border-line bg-white/60 opacity-60";
  return hasTutorialTarget("player-recipe", recipe.id)
    ? `${base} ${tutorialHighlightClass}`
    : base;
}

function playerBuildButtonClass(building) {
  const base = canPlaceStructure(building.id)
    ? "border-[#b2c79a] bg-white/90 hover:-translate-y-0.5"
    : "cursor-not-allowed border-line bg-white/60 opacity-60";
  return hasTutorialTarget("player-building", building.id)
    ? `${base} ${tutorialHighlightClass}`
    : base;
}

function buildMenuButtonClass(building) {
  const base = canPlaceStructure(building.id)
    ? "border-[#b2c79a] bg-white/90 hover:-translate-y-0.5"
    : "cursor-not-allowed border-line bg-white/60 opacity-60";
  return hasTutorialTarget("player-building", building.id)
    ? `${base} ${tutorialHighlightClass}`
    : base;
}

function transferPlayerItemToStorage(itemId) {
  moveItemFromActorToStorage(playerActor, itemId, 1);
}

function transferStorageItemToPlayer(itemId) {
  moveItemFromStorageToActor(playerActor, itemId, 1);
}

function transferPlayerItemToVillager(itemId) {
  if (!selectedVillager.value) {
    return;
  }
  moveItemFromActorToActor(playerActor, selectedVillager.value, itemId, 1);
}

function transferVillagerItemToPlayer(itemId) {
  if (!selectedVillager.value) {
    return;
  }
  moveItemFromOtherActorToPlayer(selectedVillager.value, playerActor, itemId, 1);
}

function dropPlayerInventoryItem(itemId) {
  dropPlayerItem(itemId, 1);
}

function closeWindow() {
  selectedWindow.value = null;
}

function openPlayerWindow() {
  selectedWindow.value = { type: "player" };
}

function openWorkbenchWindow() {
  selectedWindow.value = { type: "workbench" };
}

function openLumberjackHutWindow() {
  selectedWindow.value = { type: "lumberjackHut" };
}

function openStorageCompareWindow() {
  selectedWindow.value = { type: "storage-compare" };
  approachTransferTarget("storage");
}

function openVillageWindow() {
  selectedWindow.value = { type: "village" };
}

function openBuildWindow() {
  selectedWindow.value = { type: "build" };
}

function openVillagerCompareWindow(villagerId) {
  selectedWindow.value = { type: "villager-compare", id: villagerId };
  approachTransferTarget("actor", villagerId);
}

function handleConstructionSiteClick(structureId) {
  const started = startPlayerConstruction(structureId);
  if (!started) {
    openBuildWindow();
  }
}

function pickupResourceNode(nodeId) {
  pickupFieldNode(nodeId);
}
</script>
