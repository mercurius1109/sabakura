<template>
  <section class="grid content-start gap-4">
    <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
        <h2 class="font-bold">採集目標</h2>
        <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-moss">{{ enabledStockRules.length }}件有効</span>
      </div>
      <div class="grid gap-3 p-4 md:grid-cols-2">
        <div v-for="rule in stockRules" :key="rule.id" class="grid gap-3 rounded-lg border border-line bg-[#fffdf8] p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-bold">{{ itemDefinitions[rule.itemId].name }}</h3>
              <p class="mt-1 text-xs leading-5 text-muted">{{ stockRuleSourceLabel(rule) }}で補充</p>
            </div>
            <label class="flex items-center gap-2 text-sm font-bold text-moss">
              <input type="checkbox" class="h-4 w-4 accent-[#2d6a4f]" v-model="rule.enabled" @change="$emit('rule-changed', rule)">
              有効
            </label>
          </div>

          <label class="grid gap-1 text-xs font-bold text-muted">
            目標数
            <input class="rounded-md border border-line bg-white px-2 py-2 text-base font-bold text-ink" type="number" min="0" v-model.number="rule.target" @change="$emit('rule-changed', rule)">
          </label>

          <div class="rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-muted">
            現在 {{ inventory[rule.itemId] }} / 見込み {{ expectedStock(rule.itemId) }} / 目標 {{ rule.target }} / {{ stockRuleStatus(rule) }}
          </div>
        </div>
      </div>
    </article>

    <article class="overflow-hidden rounded-lg border border-line bg-white shadow-panel">
      <div class="flex items-center justify-between border-b border-line bg-[#faf8f3] px-4 py-3">
        <h2 class="font-bold">ログ</h2>
        <button class="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-bold text-moss transition hover:bg-moss hover:text-white" type="button" @click="$emit('clear-log')">
          クリア
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
</template>

<script setup>
defineProps({
  itemDefinitions: { type: Object, required: true },
  stockRules: { type: Array, required: true },
  enabledStockRules: { type: Array, required: true },
  stockRuleSourceLabel: { type: Function, required: true },
  inventory: { type: Object, required: true },
  expectedStock: { type: Function, required: true },
  stockRuleStatus: { type: Function, required: true },
  log: { type: Array, required: true },
});

defineEmits(["rule-changed", "clear-log"]);
</script>
