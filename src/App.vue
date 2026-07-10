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
            <span class="text-xs font-bold text-ink">{{ t("ui.menuVillagers") }}</span>
          </button>
          <button
            type="button"
            class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
            :class="hasTutorialTarget('menu', 'build') ? tutorialHighlightClass : ''"
            @click="openBuildWindow"
          >
            <span aria-hidden="true" class="text-2xl leading-none">🏗</span>
            <span class="text-xs font-bold text-ink">{{ t("ui.menuBuild") }}</span>
          </button>
          <button
            type="button"
            class="flex w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 text-center shadow-panel backdrop-blur transition hover:-translate-y-0.5"
            @click="toggleLogWindow"
          >
            <span aria-hidden="true" class="text-2xl leading-none">☰</span>
            <span class="text-xs font-bold text-ink">{{ t("ui.menuLog") }}</span>
          </button>
          <div class="flex items-center gap-2 rounded-2xl border border-white/55 bg-white/60 px-3 py-2 shadow-panel backdrop-blur">
            <span class="text-xs font-bold text-ink">{{ t("ui.speed") }}</span>
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

        <div v-if="!isTutorialDismissed" class="absolute right-4 top-4 z-10">
          <TutorialPanel
            :current-step="currentTutorialStep"
            :completed-count="completedTutorialSteps"
            :total-steps="totalTutorialSteps"
            :is-complete="isTutorialComplete"
            @dismiss="dismissTutorial"
          />
        </div>

        <div v-if="isLogWindowVisible" class="absolute bottom-4 right-4 z-10 w-[340px] max-w-[calc(100vw-2rem)] rounded-[26px] border border-white/40 bg-black/28 p-4 text-white shadow-panel backdrop-blur">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-bold tracking-[0.18em] text-white/80">{{ t("ui.logTitle") }}</div>
            <button type="button" class="text-xs font-bold text-white/80 transition hover:text-white" @click="clearLog">{{ t("ui.clear") }}</button>
          </div>
          <div class="mt-3 max-h-[280px] overflow-auto pr-1">
            <div v-if="log.length === 0" class="text-sm text-white/70">{{ t("ui.noLogs") }}</div>
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
                <WindowHeader :eyebrow="t('ui.player')" :title="playerActor.name" :description="t('ui.playerTransferToContainer')" @close="closeWindow" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryGrid
                    :item-cards="playerItemCards"
                    :owned-kinds="playerOwnedKinds"
                    :caption="playerTransferCaption"
                    :empty-text="t('common.carryingNone')"
                    :clickable="true"
                    :disabled="playerTransferDisabled"
                    :disabled-text="playerTransferDisabledText"
                    @select="handlePlayerTransfer"
                  />
                  <TaskPanel class="mt-4" :task="currentPlayerTask" :task-label="taskLabel" :task-progress="taskProgress" :remaining-seconds="remainingSeconds" />
                </div>
              </div>

              <div class="bg-[#f7f2e7]">
                <WindowHeader :eyebrow="t('ui.container')" :title="storageTitle" :description="t('ui.containerTransferToPlayer')" :show-close="false" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryActionGrid
                    :caption="t('ui.container')"
                    :empty-text="t('common.carryingNone')"
                    :entries="storageTransferEntries"
                    :disabled="!isPlayerAdjacentToStorage"
                    :disabled-text="t('ui.moveNextToStorage')"
                    @select="transferStorageItemToPlayer"
                  />

                  <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-sm font-bold text-ink">{{ t("ui.storageTargets") }}</div>
                      <button
                        type="button"
                        class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
                        @click="openAddStockRuleModal"
                      >
                        {{ t("ui.add") }}
                      </button>
                    </div>

                    <div v-if="registeredStockRules.length === 0" class="mt-3 text-sm text-muted">
                      {{ t("ui.noStorageTargets") }}
                    </div>

                    <div v-else class="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,88px))] gap-3">
                      <button
                        v-for="rule in registeredStockRules"
                        :key="rule.id"
                        type="button"
                        :title="stockRuleTooltip(rule)"
                        class="group relative flex h-[88px] w-[88px] items-center justify-center rounded-xl border border-line bg-[#fffdf8] transition hover:-translate-y-0.5"
                        :class="hasTutorialTarget('storage-rule', rule.itemId) ? tutorialHighlightClass : ''"
                        @click="openStockRuleModal(rule)"
                      >
                        <span class="absolute left-1.5 top-1.5 max-w-[52px] truncate text-[10px] font-bold leading-4 text-ink">
                          {{ itemDefinitions[rule.itemId].name }}
                        </span>
                        <span
                          role="button"
                          tabindex="0"
                          class="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1e8] text-[#b4491e] opacity-0 shadow-sm ring-1 ring-[#f2b899] transition group-hover:opacity-100"
                          @click.stop="removeStockRule(rule.id)"
                          @keydown.enter.stop.prevent="removeStockRule(rule.id)"
                          @keydown.space.stop.prevent="removeStockRule(rule.id)"
                        >
                          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-current" aria-hidden="true">
                            <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                          </svg>
                        </span>
                        <span class="text-3xl leading-none" aria-hidden="true">{{ itemDefinitions[rule.itemId].icon }}</span>
                        <span class="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold leading-5 text-ambered">
                          {{ t("ui.currentOfTarget", { current: inventory[rule.itemId], target: rule.target }) }}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div v-if="showAddStockRuleModal" class="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-4">
                    <div class="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-panel">
                      <div class="flex items-center justify-between gap-2">
                        <h3 class="text-lg font-bold">{{ t("ui.addStorageTarget") }}</h3>
                        <button type="button" class="text-sm font-bold text-muted" @click="closeAddStockRuleModal">{{ t("ui.close") }}</button>
                      </div>

                      <div v-if="availableStockRules.length === 0" class="mt-4 text-sm text-muted">
                        {{ t("ui.allItemsRegistered") }}
                      </div>

                      <div v-else class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(72px,72px))] gap-3">
                        <button
                          v-for="rule in availableStockRules"
                          :key="rule.id"
                          type="button"
                          :title="itemDefinitions[rule.itemId].name"
                          class="relative flex h-[72px] w-[72px] items-center justify-center rounded-xl border bg-[#fffdf8] transition"
                          :class="draftStockRuleId === rule.id
                            ? 'border-moss shadow-[0_0_0_2px_rgba(45,106,79,0.25)]'
                            : 'border-line hover:-translate-y-0.5'"
                          @click="draftStockRuleId = rule.id"
                        >
                          <span class="absolute left-1.5 top-1.5 max-w-[46px] truncate text-[10px] font-bold leading-4 text-ink">
                            {{ itemDefinitions[rule.itemId].name }}
                          </span>
                          <span class="text-3xl leading-none" aria-hidden="true">{{ itemDefinitions[rule.itemId].icon }}</span>
                        </button>
                      </div>

                      <label class="mt-4 grid gap-1 text-sm font-bold text-muted">
                        {{ t("ui.target") }}
                        <input
                          v-model.number="draftStockRuleTarget"
                          class="rounded-md border border-line bg-white px-3 py-2 text-base text-ink"
                          type="number"
                          min="1"
                        >
                      </label>

                      <button
                        type="button"
                        class="mt-4 w-full rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss"
                        :disabled="!canSubmitStockRule"
                        @click="submitStockRuleEntry"
                      >
                        {{ t("ui.confirm") }}
                      </button>
                    </div>
                  </div>

                  <div v-if="showEditStockRuleModal && editingStockRule" class="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-4">
                    <div class="w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-panel">
                      <div class="flex items-center justify-between gap-2">
                        <h3 class="text-lg font-bold">{{ itemDefinitions[editingStockRule.itemId].name }}</h3>
                        <button type="button" class="text-sm font-bold text-muted" @click="closeStockRuleModal">{{ t("ui.close") }}</button>
                      </div>

                      <div class="mt-3 rounded-md border border-line bg-[#fffdf8] px-3 py-3 text-sm text-muted">
                        {{ t("ui.stockLine", { current: inventory[editingStockRule.itemId], expected: expectedStock(editingStockRule.itemId), status: stockRuleStatus(editingStockRule) }) }}
                      </div>

                      <label class="mt-4 grid gap-1 text-sm font-bold text-muted">
                        {{ t("ui.target") }}
                        <input
                          v-model.number="editingStockRuleTarget"
                          class="rounded-md border border-line bg-white px-3 py-2 text-base text-ink"
                          type="number"
                          min="1"
                        >
                      </label>

                      <div class="mt-4 flex gap-2">
                        <button
                          type="button"
                          class="flex-1 rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss"
                          @click="submitStockRuleEdit"
                        >
                          {{ t("ui.confirm") }}
                        </button>
                        <button
                          type="button"
                          class="rounded-md border border-line bg-white px-4 py-2.5 font-bold text-ambered transition hover:bg-ambered hover:text-white"
                          @click="removeStockRule(editingStockRule.id)"
                        >
                          {{ t("ui.remove") }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="isVillagerCompareWindow && selectedVillager">
              <div class="bg-[#fbf8f1]">
                <WindowHeader :eyebrow="t('ui.player')" :title="playerActor.name" :description="t('ui.playerStatusInspect')" @close="closeWindow" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryGrid
                    :item-cards="playerItemCards"
                    :owned-kinds="playerOwnedKinds"
                    :caption="playerTransferCaption"
                    :empty-text="t('common.carryingNone')"
                    :clickable="true"
                    :disabled="playerTransferDisabled"
                    :disabled-text="playerTransferDisabledText"
                    @select="handlePlayerTransfer"
                  />
                  <TaskPanel class="mt-4" :task="currentPlayerTask" :task-label="taskLabel" :task-progress="taskProgress" :remaining-seconds="remainingSeconds" />

                  <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-sm font-bold text-ink">{{ t("ui.handCraft") }}</div>
                      <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
                        {{ isPlayerBusy ? t("ui.busy") : t("ui.ready") }}
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
                <WindowHeader :eyebrow="t('ui.villager')" :title="selectedVillager.name" :description="t('ui.villagerInspect')" :show-close="false" />
                <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                  <InventoryActionGrid
                    :caption="t('ui.villagerInventory')"
                    :empty-text="t('common.carryingNone')"
                    :entries="selectedVillagerTransferOutEntries"
                    :disabled="!isPlayerAdjacentToSelectedVillager"
                    :disabled-text="t('ui.moveNextToVillager')"
                    @select="transferVillagerItemToPlayer"
                  />

                  <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                    <div class="text-sm font-bold text-ink">{{ t("ui.assignedStations") }}</div>
                    <div v-if="selectedVillagerStations.length === 0" class="mt-3 text-sm text-muted">{{ t("ui.noAssignedStations") }}</div>
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
                  <WindowHeader :eyebrow="t('ui.player')" :title="playerActor.name" :description="t('ui.playerInspect')" @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <InventoryGrid
                      :item-cards="playerItemCards"
                      :owned-kinds="playerOwnedKinds"
                      :caption="playerTransferCaption"
                      :empty-text="t('common.carryingNone')"
                      :clickable="true"
                      :disabled="playerTransferDisabled"
                      :disabled-text="playerTransferDisabledText"
                      @select="handlePlayerTransfer"
                    />

                    <TaskPanel class="mt-4" :task="currentPlayerTask" :task-label="taskLabel" :task-progress="taskProgress" :remaining-seconds="remainingSeconds" />

                    <div class="mt-4 rounded-2xl border border-line bg-white/80 p-4">
                      <div class="flex items-center justify-between gap-2">
                        <div class="text-sm font-bold text-ink">{{ t("ui.handCraft") }}</div>
                        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">
                          {{ isPlayerBusy ? t("ui.busy") : t("ui.ready") }}
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
                        <div class="text-sm font-bold text-ink">{{ t("ui.build") }}</div>
                        <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-muted">
                          {{ playerBuildCards.length }} {{ t("ui.options") }}
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
                  <WindowHeader :eyebrow="t('ui.villagers')" :title="t('ui.village')" :description="t('ui.villageInspect')" @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <button
                      type="button"
                      class="rounded-2xl border border-line bg-white px-4 py-2 text-sm font-bold text-moss transition hover:bg-moss hover:text-white"
                      :class="hasTutorialTarget('village-action', 'add-villager') ? tutorialHighlightClass : ''"
                      @click="addVillager"
                    >
                      {{ t("ui.addVillager") }}
                    </button>
                    <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(120px,120px))] gap-3">
                      <button
                        v-for="villager in villagers"
                        :key="villager.id"
                        type="button"
                        class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-2xl border border-line bg-white/85 px-3 py-3 text-left transition hover:-translate-y-0.5"
                        @click="openVillagerCompareWindow(villager.id)"
                      >
                        <div class="pr-10 text-xs font-bold leading-4 text-ink">{{ villager.name }}</div>
                        <div class="flex items-center justify-center text-4xl leading-none text-ink/80" aria-hidden="true">🧑</div>
                        <div class="flex items-end justify-between gap-2">
                          <span class="max-w-[56px] truncate text-[10px] font-bold leading-4 text-muted">
                            {{ selectedVillagerStationsLabel(villager) }}
                          </span>
                          <span class="rounded-full px-2 py-1 text-[10px] font-bold leading-none" :class="villager.taskId ? 'bg-orange-100 text-ambered' : 'bg-emerald-100 text-moss'">
                            {{ villager.taskId ? t("ui.busy") : t("ui.idle") }}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else-if="selectedWindow.type === 'build'">
                  <WindowHeader :eyebrow="t('ui.build')" :title="t('ui.construction')" :description="t('ui.buildInspect')" @close="closeWindow" />
                  <div class="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 py-4">
                    <div class="grid grid-cols-[repeat(auto-fill,minmax(120px,120px))] gap-3">
                      <button
                        v-for="building in playerBuildCards"
                        :key="building.id"
                        type="button"
                        class="relative flex h-[120px] w-[120px] flex-col justify-between rounded-2xl border px-3 py-3 text-left transition"
                        :class="buildMenuButtonClass(building)"
                        :disabled="!canPlaceStructure(building.id)"
                        @click="placeStructure(building.id)"
                      >
                        <div class="pr-2 text-xs font-bold leading-4 text-ink">{{ building.name }}</div>
                        <div class="flex items-center justify-center text-4xl leading-none" aria-hidden="true">{{ building.icon }}</div>
                        <div class="text-[10px] leading-4 text-muted">{{ formatList(building.costs) }}</div>
                        <div class="self-end rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold leading-none text-muted">
                          {{ buildingStatus(building.id) }}
                        </div>
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else-if="selectedWindow.type === 'workbench' && workbenchStation">
                  <WindowHeader :eyebrow="t('common.facility')" :title="workbenchStation.name" :description="t('ui.facilityInspect')" @close="closeWindow" />
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
                      :item-definitions="itemDefinitions"
                      :station-name-by-id="stationName"
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
                  <WindowHeader :eyebrow="t('common.facility')" :title="lumberjackHutStation.name" :description="t('ui.facilityInspect')" @close="closeWindow" />
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
                      :item-definitions="itemDefinitions"
                      :station-name-by-id="stationName"
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
import { useI18n } from "./i18n/index.js";

const { t } = useI18n();

const selectedWindow = ref(null);
const isTutorialDismissed = ref(false);
const isLogWindowVisible = ref(true);
const editingStockRuleId = ref(null);
const editingStockRuleTarget = ref(0);
const showAddStockRuleModal = ref(false);
const draftStockRuleId = ref(null);
const draftStockRuleTarget = ref(1);

const {
  itemDefinitions,
  inventory,
  storage,
  placedStructures,
  constructionSites,
  constructionQueue,
  craftQueue,
  gatherQueue,
  gatherActions,
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
  visibleFieldNodes,
  recipeById,
  buildingById,
  stationById: (stationId) => stations.find((station) => station.id === stationId) || null,
  assignedVillagerList,
  stationCraftEntries,
  stockRules,
  itemDefinitions,
});

const tutorialHighlightClass = "tutorial-highlight tutorial-highlight-ui";
const currentTutorialTargets = computed(() => currentTutorialStep.value?.highlightTargets || []);

function dismissTutorial() {
  if (!isTutorialComplete.value) {
    return;
  }
  isTutorialDismissed.value = true;
}

function toggleLogWindow() {
  isLogWindowVisible.value = !isLogWindowVisible.value;
}

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
        }, t("ui.close"))
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
                ? "relative flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-md border border-[#d6ccb8] bg-[#f3ecdf] opacity-50"
                : "relative flex h-10 w-10 items-center justify-center rounded-md border border-[#d6ccb8] bg-[#f3ecdf] transition hover:-translate-y-0.5",
              onClick: () => {
                if (!props.disabled) {
                  emit("select", entry.id);
                }
              },
            }, [
              h("span", { class: "text-xl leading-none", "aria-hidden": "true" }, entry.icon),
              entry.amount > 1
                ? h(
                  "span",
                  { class: "absolute bottom-0.5 right-0.5 rounded-full bg-white/90 px-1 text-[10px] font-bold leading-4 text-ambered shadow-sm" },
                  String(entry.amount),
                )
                : null,
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
        h("div", { class: "text-sm font-bold text-ink" }, t("ui.currentTask")),
        h("span", { class: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss" }, props.task ? phaseText(props.task.phase) : t("ui.idle")),
      ]),
      props.task
        ? h("div", { class: "mt-3 rounded-xl border border-line bg-[#faf8f3] px-3 py-3" }, [
          h("div", { class: "flex items-center justify-between gap-2 text-sm font-bold text-ink" }, [
            h("span", props.taskLabel(props.task)),
            h("span", { class: "text-xs text-muted" }, t("ui.leftSeconds", { seconds: props.remainingSeconds(props.task) })),
          ]),
          h("div", { class: "mt-2 h-2.5 overflow-hidden rounded-full border border-[#c7bdad] bg-[#eee7dd]" }, [
            h("div", {
              class: "h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]",
              style: { width: `${props.taskProgress(props.task)}%` },
            }),
          ]),
        ])
        : h("div", { class: "mt-3 text-sm text-muted" }, t("ui.noActiveTask")),
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
const editingStockRule = computed(() =>
  stockRules.find((rule) => rule.id === editingStockRuleId.value) || null,
);
const showEditStockRuleModal = computed(() => Boolean(editingStockRuleId.value));
const registeredStockRules = computed(() => uniqueStockRules(stockRules.filter((rule) => rule.enabled)));
const availableStockRules = computed(() =>
  uniqueStockRules(
    stockRules.filter((rule) =>
      !rule.enabled && !stockRules.some((otherRule) => otherRule.enabled && otherRule.itemId === rule.itemId),
    ),
  ),
);
const canSubmitStockRule = computed(() =>
  Boolean(draftStockRuleId.value) && Number(draftStockRuleTarget.value) >= 1,
);

const currentPlayerTask = computed(() => taskForActor(playerActor.id));
const currentSelectedVillagerTask = computed(() => taskForActor(selectedVillager.value?.id || null));
const playerTransferContext = computed(() => {
  if (isStorageCompareWindow.value) {
    return {
      mode: "storage",
      label: t("ui.storage"),
      disabled: !isPlayerAdjacentToStorage.value,
      disabledText: t("ui.moveNextToStorage"),
    };
  }

  if (isVillagerCompareWindow.value && selectedVillager.value) {
    return {
      mode: "actor",
      label: selectedVillager.value.name,
      disabled: !isPlayerAdjacentToSelectedVillager.value,
      disabledText: t("ui.moveNextToVillager"),
    };
  }

  return {
    mode: "drop",
    label: t("ui.groundItems"),
    disabled: false,
    disabledText: "",
  };
});
const playerTransferCaption = computed(() => t("ui.transferTo", { target: playerTransferContext.value.label }));
const playerTransferDisabled = computed(() => playerTransferContext.value.disabled);
const playerTransferDisabledText = computed(() => playerTransferContext.value.disabledText);

const playerBuildCards = computed(() => [
  {
    id: "workbench",
    name: itemDefinitions.workbench?.name || t("item.workbench"),
    icon: itemDefinitions.workbench?.icon || "?",
    costs: { wood: 4 },
  },
  {
    id: "storage",
    name: itemDefinitions.storage?.name || t("item.storage"),
    icon: itemDefinitions.storage?.icon || "?",
    costs: { wood: 6, stone: 2 },
  },
  {
    id: "lumberjackHut",
    name: itemDefinitions.lumberjackHut?.name || t("item.lumberjackHut"),
    icon: itemDefinitions.lumberjackHut?.icon || "?",
    costs: { wood: 8, stone: 4 },
  },
]);

const storageTitle = computed(() => (placedStructures.storage ? t("ui.storage") : t("ui.groundItems")));

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
    return t("taskPhase.movingToTarget");
  }
  if (phase === "working") {
    return t("taskPhase.working");
  }
  if (phase === "movingToStorage") {
    return t("taskPhase.movingToStorage");
  }
  return t("taskPhase.idle");
}

function selectedVillagerStationsLabel(villager) {
  if (!villager?.assignedStations?.length) {
    return t("ui.noStation");
  }

  return villager.assignedStations.map((stationId) => stationName(stationId)).join(", ");
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

function stockRuleTooltip(rule) {
  return `${itemDefinitions[rule.itemId].name}\n${storage[rule.itemId] || 0}/${rule.target}\n${stockRuleStatus(rule)}`;
}

function stockRulePriority(rule) {
  const action = gatherActions.find((entry) => entry.id === rule.actionId);
  if (!action) {
    return 0;
  }
  let score = 0;
  if (action.requiresStation) {
    score += 2;
  }
  if (action.requiresItem) {
    score += 1;
  }
  return score;
}

function uniqueStockRules(rules) {
  const byItemId = new Map();

  rules.forEach((rule) => {
    const current = byItemId.get(rule.itemId);
    if (!current) {
      byItemId.set(rule.itemId, rule);
      return;
    }

    if (rule.enabled && !current.enabled) {
      byItemId.set(rule.itemId, rule);
      return;
    }

    if (stockRulePriority(rule) > stockRulePriority(current)) {
      byItemId.set(rule.itemId, rule);
    }
  });

  return [...byItemId.values()];
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

function handlePlayerTransfer(itemId) {
  if (playerTransferContext.value.mode === "storage") {
    transferPlayerItemToStorage(itemId);
    return;
  }

  if (playerTransferContext.value.mode === "actor") {
    transferPlayerItemToVillager(itemId);
    return;
  }

  dropPlayerInventoryItem(itemId);
}

function openStockRuleModal(rule) {
  editingStockRuleId.value = rule.id;
  editingStockRuleTarget.value = Math.max(1, Number(rule.target) || 1);
}

function closeStockRuleModal() {
  editingStockRuleId.value = null;
}

function openAddStockRuleModal() {
  showAddStockRuleModal.value = true;
  draftStockRuleId.value = availableStockRules.value[0]?.id || null;
  draftStockRuleTarget.value = 1;
}

function closeAddStockRuleModal() {
  showAddStockRuleModal.value = false;
  draftStockRuleId.value = null;
  draftStockRuleTarget.value = 1;
}

function submitStockRuleEntry() {
  const rule = stockRules.find((entry) => entry.id === draftStockRuleId.value);
  if (!rule || Number(draftStockRuleTarget.value) < 1) {
    return;
  }

  rule.enabled = true;
  rule.target = Number(draftStockRuleTarget.value);
  onRuleChanged(rule);
  closeAddStockRuleModal();
}

function submitStockRuleEdit() {
  if (!editingStockRule.value) {
    return;
  }
  if (Number(editingStockRuleTarget.value) < 1) {
    return;
  }
  editingStockRule.value.enabled = true;
  editingStockRule.value.target = Number(editingStockRuleTarget.value);
  onRuleChanged(editingStockRule.value);
  closeStockRuleModal();
}

function removeStockRule(ruleId) {
  const rule = stockRules.find((entry) => entry.id === ruleId);
  if (!rule) {
    return;
  }

  rule.enabled = false;
  onRuleChanged(rule);
  if (editingStockRuleId.value === ruleId) {
    closeStockRuleModal();
  }
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
