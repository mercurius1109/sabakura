<template>
  <div class="mx-auto w-full max-w-[1220px] px-[14px] py-6">
    <header class="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-normal md:text-4xl">サバイバルクラフト管理UI</h1>
        <p class="mt-2 max-w-3xl leading-7 text-muted">
          素材、設備、村人、レシピ、在庫ルールをまとめて扱う最小プロトタイプです。
          見込み在庫が目標数未満になると、村人が担当設備の範囲で自動補充します。
        </p>
      </div>
      <div class="rounded-lg border border-line bg-white/70 px-4 py-3 md:min-w-44 md:text-right">
        <div class="text-xs font-semibold text-muted">経過時間</div>
        <div class="mt-1 text-lg font-bold">{{ elapsedTime }}</div>
      </div>
    </header>

    <main class="grid gap-4 xl:grid-cols-[0.92fr_1.42fr]">
      <section class="grid content-start gap-4">
        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">採集</h2>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">手作業</span>
          </div>
          <div class="grid gap-2 p-4 sm:grid-cols-2">
            <button class="rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss" type="button" @click="gather('wood')">
              木を集める +1
            </button>
            <button class="rounded-md bg-leaf px-4 py-2.5 font-bold text-white transition hover:bg-moss" type="button" @click="gather('stone')">
              石を集める +1
            </button>
          </div>
        </article>

        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">インベントリ</h2>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ ownedKinds }}種類</span>
          </div>
          <div class="grid grid-cols-2 gap-2 p-4">
            <div v-for="item in itemList" :key="item.id" class="rounded-md border border-line bg-[#fffdf8] px-3 py-2">
              <div class="flex min-h-8 items-center justify-between gap-2">
                <span class="text-sm text-muted">{{ item.name }}</span>
                <span class="text-lg font-bold">{{ inventory[item.id] }}</span>
              </div>
              <div class="mt-1 text-xs text-muted">見込み {{ expectedStock(item.id) }}</div>
            </div>
          </div>
        </article>

        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">設備</h2>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ availableStations.length }} / {{ stations.length }}</span>
          </div>
          <div class="grid gap-2 p-4">
            <div v-for="station in stations" :key="station.id" class="rounded-md border border-line bg-[#fffdf8] p-3">
              <div class="flex items-center justify-between gap-2 font-bold">
                <span>{{ station.name }}</span>
                <span class="rounded-full px-3 py-1 text-xs font-bold" :class="isStationAvailable(station.id) ? 'bg-emerald-100 text-moss' : 'bg-orange-100 text-ambered'">
                  {{ isStationAvailable(station.id) ? "使用可能" : "未解放" }}
                </span>
              </div>
              <p class="mt-2 text-sm leading-6 text-muted">{{ station.description }}</p>
              <p class="mt-1 text-xs text-muted">担当村人: {{ assignedVillagers(station.id) || "なし" }}</p>
            </div>
          </div>
        </article>

        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">村人</h2>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ villagers.length }}人</span>
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
              <div class="mt-3 grid grid-cols-2 gap-1 rounded-md border border-line bg-white p-1" role="group" :aria-label="`${villager.name}の設備割り当て`">
                <button
                  v-for="station in stations"
                  :key="station.id"
                  type="button"
                  class="rounded px-2 py-2 text-sm font-bold transition"
                  :class="villager.assignedStation === station.id ? 'bg-leaf text-white' : 'text-muted hover:bg-[#eef4ee]'"
                  :disabled="villager.taskId || !isStationAvailable(station.id)"
                  @click="assignVillager(villager, station.id)"
                >
                  {{ station.name }}
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="grid content-start gap-4">
        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">レシピ</h2>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ unlockedRecipes.length }}件解放</span>
          </div>
          <div class="grid gap-3 p-4 md:grid-cols-2">
            <div v-for="recipe in recipes" :key="recipe.id" class="grid gap-3 rounded-lg border p-3" :class="isRecipeUnlocked(recipe) ? 'border-line bg-[#fffdf8]' : 'border-line bg-[#f7f3ed] opacity-80'">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-bold">{{ recipe.name }}</h3>
                  <div class="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    <span>{{ stationName(recipe.station) }}</span>
                    <span>{{ (recipe.duration / 1000).toFixed(1) }}秒</span>
                  </div>
                </div>
                <span class="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold" :class="isRecipeUnlocked(recipe) ? 'bg-emerald-100 text-moss' : 'bg-orange-100 text-ambered'">
                  {{ recipeBadge(recipe) }}
                </span>
              </div>

              <div class="text-sm leading-6 text-muted">必要: {{ formatList(recipe.costs) }}</div>
              <div class="text-sm leading-6 text-muted">成果: {{ formatList(recipe.outputs) }}</div>
              <div class="text-xs leading-5 text-muted">担当可能な村人: {{ availableVillagerNames(recipe) || "なし" }}</div>

              <div class="grid grid-cols-2 gap-1 rounded-md border border-line bg-white p-1" role="group" :aria-label="`${recipe.name}の担当者`">
                <button
                  v-for="worker in workerOptions"
                  :key="worker.id"
                  type="button"
                  class="rounded px-2 py-2 text-sm font-bold transition"
                  :class="selectedWorkers[recipe.id] === worker.id ? 'bg-leaf text-white' : 'text-muted hover:bg-[#eef4ee]'"
                  :disabled="!isRecipeUnlocked(recipe) || (worker.id === 'villager' && !availableVillagerForRecipe(recipe))"
                  @click="selectedWorkers[recipe.id] = worker.id"
                >
                  {{ worker.label }}
                </button>
              </div>

              <button
                type="button"
                class="rounded-md px-4 py-2.5 font-bold text-white transition"
                :class="canStart(recipe) ? 'bg-leaf hover:bg-moss' : 'cursor-not-allowed bg-stone-400'"
                :disabled="!canStart(recipe)"
                @click="startCraft(recipe.id)"
              >
                開始
              </button>
            </div>
          </div>
        </article>

        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">在庫管理</h2>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ enabledStockRules.length }}件稼働</span>
          </div>
          <div class="grid gap-3 p-4 md:grid-cols-2">
            <div v-for="rule in stockRules" :key="rule.id" class="grid gap-3 rounded-lg border border-line bg-[#fffdf8] p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="font-bold">{{ itemDefinitions[rule.itemId] }}</h3>
                  <p class="mt-1 text-xs leading-5 text-muted">{{ recipeById(rule.recipeId).name }}で補充</p>
                </div>
                <label class="flex items-center gap-2 text-sm font-bold text-moss">
                  <input type="checkbox" class="h-4 w-4 accent-[#2d6a4f]" v-model="rule.enabled" @change="onRuleChanged(rule)">
                  有効
                </label>
              </div>

              <label class="grid gap-1 text-xs font-bold text-muted">
                目標数
                <input class="rounded-md border border-line bg-white px-2 py-2 text-base font-bold text-ink" type="number" min="0" v-model.number="rule.target" @change="onRuleChanged(rule)">
              </label>

              <div class="rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-muted">
                現在 {{ inventory[rule.itemId] }} / 見込み {{ expectedStock(rule.itemId) }} / 目標 {{ rule.target }} / {{ stockRuleStatus(rule) }}
              </div>
            </div>
          </div>
        </article>

        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">クラフトキュー</h2>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ craftQueue.length }}件進行中</span>
          </div>
          <div class="grid gap-2 p-4">
            <div v-if="craftQueue.length === 0" class="rounded-md border border-dashed border-line bg-[#fffdf8] p-3 text-sm leading-6 text-muted">
              進行中のクラフトはありません。
            </div>
            <div v-for="task in craftQueue" :key="task.id" class="rounded-md border border-line bg-[#fffdf8] p-3">
              <div class="flex items-center justify-between gap-2 font-bold">
                <span>{{ recipeById(task.recipeId).name }}</span>
                <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ task.source === "auto" ? "自動" : "手動" }}</span>
              </div>
              <div class="mt-1 text-sm leading-6 text-muted">
                {{ stationName(task.station) }} / {{ task.workerType === "villager" ? villagerName(task.villagerId) : "自分" }}
              </div>
              <div class="mt-3 grid gap-1.5">
                <div class="flex justify-between text-sm text-muted">
                  <span>{{ taskProgress(task) }}%</span>
                  <span>残り {{ remainingSeconds(task) }}秒</span>
                </div>
                <div class="h-3 overflow-hidden rounded-full border border-[#c7bdad] bg-[#eee7dd]">
                  <div class="h-full rounded-full bg-gradient-to-r from-leaf to-lime-600 transition-[width]" :style="{ width: `${taskProgress(task)}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
          <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
            <h2 class="font-bold">ログ</h2>
            <button class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white" type="button" @click="clearLog">
              消去
            </button>
          </div>
          <div class="max-h-48 overflow-auto p-4">
            <div v-if="log.length === 0" class="rounded-md border border-dashed border-line bg-[#fffdf8] p-3 text-sm leading-6 text-muted">
              ログはありません。
            </div>
            <div v-for="entry in log" :key="entry.id" class="py-0.5 text-sm leading-6 text-muted">{{ entry.text }}</div>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";

const itemDefinitions = {
  wood: "木",
  stone: "石",
  workbench: "作業台",
  plank: "木の板",
  stick: "棒",
  stoneAxe: "石斧",
};

const stations = [
  {
    id: "hand",
    name: "基本作業",
    description: "作業台なしで行うクラフトです。",
  },
  {
    id: "workbench",
    name: "作業台",
    description: "作業台を作成すると使える設備です。",
  },
];

const recipes = [
  {
    id: "workbench",
    name: "作業台",
    station: "hand",
    duration: 6000,
    costs: { wood: 4 },
    outputs: { workbench: 1 },
  },
  {
    id: "plank",
    name: "木の板",
    station: "hand",
    duration: 3000,
    costs: { wood: 1 },
    outputs: { plank: 2 },
  },
  {
    id: "stick",
    name: "棒",
    station: "workbench",
    requiresFacility: "workbench",
    duration: 3500,
    costs: { plank: 2 },
    outputs: { stick: 4 },
  },
  {
    id: "stoneAxe",
    name: "石斧",
    station: "workbench",
    requiresFacility: "workbench",
    duration: 8000,
    costs: { stone: 3, stick: 2 },
    outputs: { stoneAxe: 1 },
  },
];

const startedAt = Date.now();
const now = ref(Date.now());
const inventory = reactive({
  wood: 0,
  stone: 0,
  workbench: 0,
  plank: 0,
  stick: 0,
  stoneAxe: 0,
});
const villagers = reactive([
  {
    id: "villager-haru",
    name: "ハル",
    assignedStation: "hand",
    taskId: null,
  },
]);
const craftQueue = reactive([]);
const log = reactive([]);
const selectedWorkers = reactive(Object.fromEntries(recipes.map((recipe) => [recipe.id, "self"])));
const workerOptions = [
  { id: "self", label: "自分で作る" },
  { id: "villager", label: "村人に任せる" },
];
const stockRules = reactive(recipes.map((recipe) => {
  const itemId = Object.keys(recipe.outputs)[0];
  const defaultTarget = {
    workbench: 1,
    plank: 6,
    stick: 8,
    stoneAxe: 1,
  }[itemId];

  return {
    id: `stock-${itemId}`,
    recipeId: recipe.id,
    itemId,
    enabled: false,
    target: defaultTarget,
  };
}));

const itemList = computed(() => Object.entries(itemDefinitions).map(([id, name]) => ({ id, name })));
const hasWorkbench = computed(() => inventory.workbench > 0);
const ownedKinds = computed(() => Object.values(inventory).filter((amount) => amount > 0).length);
const unlockedRecipes = computed(() => recipes.filter((recipe) => isRecipeUnlocked(recipe)));
const enabledStockRules = computed(() => stockRules.filter((rule) => rule.enabled));
const availableStations = computed(() => stations.filter((station) => isStationAvailable(station.id)));
const elapsedTime = computed(() => {
  const elapsed = Math.floor((now.value - startedAt) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
});

function makeId(prefix) {
  const canUseRandomUUID = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
  return canUseRandomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random()}`;
}

function addLog(message) {
  const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  log.unshift({ id: makeId("log"), text: `${time} ${message}` });
  if (log.length > 18) {
    log.splice(18);
  }
}

function recipeById(recipeId) {
  return recipes.find((recipe) => recipe.id === recipeId);
}

function stationById(stationId) {
  return stations.find((station) => station.id === stationId);
}

function stationName(stationId) {
  return stationById(stationId).name;
}

function formatList(map) {
  return Object.entries(map)
    .map(([itemId, amount]) => `${itemDefinitions[itemId]} x${amount}`)
    .join("、");
}

function isStationAvailable(stationId) {
  return stationId === "hand" || (stationId === "workbench" && hasWorkbench.value);
}

function assignedVillagers(stationId) {
  return villagers
    .filter((villager) => villager.assignedStation === stationId)
    .map((villager) => villager.name)
    .join("、");
}

function isRecipeUnlocked(recipe) {
  return !recipe.requiresFacility || inventory[recipe.requiresFacility] > 0;
}

function hasResources(recipe) {
  return Object.entries(recipe.costs).every(([itemId, amount]) => inventory[itemId] >= amount);
}

function availableVillagerForRecipe(recipe) {
  return villagers.find((villager) => villager.taskId === null && villager.assignedStation === recipe.station);
}

function availableVillagerNames(recipe) {
  return villagers
    .filter((villager) => villager.taskId === null && villager.assignedStation === recipe.station)
    .map((villager) => villager.name)
    .join("、");
}

function villagerName(villagerId) {
  const villager = villagers.find((entry) => entry.id === villagerId);
  return villager ? villager.name : "村人";
}

function recipeBadge(recipe) {
  if (!isRecipeUnlocked(recipe)) {
    return `${itemDefinitions[recipe.requiresFacility]}で解放`;
  }
  return "解放済み";
}

function villagerNote(villager) {
  const task = craftQueue.find((entry) => entry.id === villager.taskId);
  if (!task) {
    return `${stationName(villager.assignedStation)}に割り当て中。この設備の作業だけ担当します。`;
  }
  return `${recipeById(task.recipeId).name}を担当しています。`;
}

function assignVillager(villager, stationId) {
  if (villager.taskId || !isStationAvailable(stationId)) {
    return;
  }
  villager.assignedStation = stationId;
  addLog(`${villager.name}を${stationName(stationId)}に割り当てました。`);
  checkStockRules();
}

function pendingOutputs(itemId) {
  return craftQueue.reduce((total, task) => {
    const recipe = recipeById(task.recipeId);
    return total + (recipe.outputs[itemId] || 0);
  }, 0);
}

function expectedStock(itemId) {
  return inventory[itemId] + pendingOutputs(itemId);
}

function activeAutoTaskForRule(rule) {
  return craftQueue.some((task) => task.ruleId === rule.id);
}

function normalizeRule(rule) {
  rule.target = Math.max(0, Number.isFinite(rule.target) ? Math.floor(rule.target) : 0);
}

function stockRuleStatus(rule) {
  const recipe = recipeById(rule.recipeId);
  if (!rule.enabled) {
    return "停止中";
  }
  if (!isRecipeUnlocked(recipe)) {
    return "レシピ未解放";
  }
  if (!availableVillagerForRecipe(recipe)) {
    return `${stationName(recipe.station)}担当の村人待ち`;
  }
  if (!hasResources(recipe)) {
    return "素材待ち";
  }
  if (activeAutoTaskForRule(rule)) {
    return "補充中";
  }
  if (expectedStock(rule.itemId) < rule.target) {
    return "発注待ち";
  }
  return "目標達成";
}

function onRuleChanged(rule) {
  normalizeRule(rule);
  checkStockRules();
}

function canStart(recipe) {
  if (!isRecipeUnlocked(recipe) || !hasResources(recipe)) {
    return false;
  }
  return selectedWorkers[recipe.id] === "self" || Boolean(availableVillagerForRecipe(recipe));
}

function gather(itemId) {
  inventory[itemId] += 1;
  addLog(`${itemDefinitions[itemId]}を1個集めました。`);
  checkStockRules();
}

function startCraft(recipeId, options = {}) {
  const recipe = recipeById(recipeId);
  const workerType = options.workerType || selectedWorkers[recipeId];
  const source = options.source || "manual";
  if (!recipe || !isRecipeUnlocked(recipe) || !hasResources(recipe)) {
    return false;
  }

  let villagerId = null;
  if (workerType === "villager") {
    const villager = availableVillagerForRecipe(recipe);
    if (!villager) {
      if (source === "manual") {
        addLog(`${stationName(recipe.station)}担当の村人が待機していません。`);
      }
      return false;
    }
    villagerId = villager.id;
  }

  const task = {
    id: makeId("task"),
    recipeId,
    workerType,
    villagerId,
    station: recipe.station,
    source,
    ruleId: options.ruleId || null,
    startedAt: Date.now(),
    duration: recipe.duration,
  };

  if (villagerId) {
    const villager = villagers.find((entry) => entry.id === villagerId);
    villager.taskId = task.id;
  }

  craftQueue.push(task);
  const workerLabel = workerType === "villager" ? villagerName(villagerId) : "自分";
  addLog(`${recipe.name}のクラフトを開始しました。担当: ${workerLabel}${source === "auto" ? " / 在庫ルール" : ""}`);
  return true;
}

function completeTask(task) {
  const recipe = recipeById(task.recipeId);
  if (hasResources(recipe)) {
    Object.entries(recipe.costs).forEach(([itemId, amount]) => {
      inventory[itemId] -= amount;
    });
    Object.entries(recipe.outputs).forEach(([itemId, amount]) => {
      inventory[itemId] += amount;
    });
    addLog(`${recipe.name}が完成しました。消費: ${formatList(recipe.costs)} / 入手: ${formatList(recipe.outputs)}`);
  } else {
    addLog(`${recipe.name}は完成直前に素材不足で中止されました。`);
  }

  if (task.villagerId) {
    const villager = villagers.find((entry) => entry.id === task.villagerId);
    if (villager) {
      villager.taskId = null;
    }
  }

  const index = craftQueue.findIndex((entry) => entry.id === task.id);
  if (index >= 0) {
    craftQueue.splice(index, 1);
  }
}

function checkStockRules() {
  stockRules.forEach((rule) => {
    normalizeRule(rule);
    if (!rule.enabled) {
      return;
    }

    const recipe = recipeById(rule.recipeId);
    const expected = expectedStock(rule.itemId);
    if (expected >= rule.target || activeAutoTaskForRule(rule)) {
      return;
    }
    if (!isRecipeUnlocked(recipe) || !hasResources(recipe) || !availableVillagerForRecipe(recipe)) {
      return;
    }
    startCraft(recipe.id, { source: "auto", workerType: "villager", ruleId: rule.id });
  });
}

function taskProgress(task) {
  return Math.min(100, Math.floor(((now.value - task.startedAt) / task.duration) * 100));
}

function remainingSeconds(task) {
  return Math.max(0, Math.ceil((task.duration - (now.value - task.startedAt)) / 1000));
}

function tick() {
  now.value = Date.now();
  craftQueue
    .filter((task) => now.value - task.startedAt >= task.duration)
    .forEach(completeTask);
  checkStockRules();
}

function clearLog() {
  log.splice(0);
}

let timerId = null;

onMounted(() => {
  addLog("拠点を作り始めました。木と石を集めましょう。");
  timerId = setInterval(tick, 250);
});

onUnmounted(() => {
  clearInterval(timerId);
});
</script>
