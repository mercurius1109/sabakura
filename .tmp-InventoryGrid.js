
import { computed } from "vue";
import { useI18n } from "../i18n/index.js";

const { t } = useI18n();

const props = defineProps({
  itemCards: { type: Array, required: true },
  ownedKinds: { type: Number, required: true },
});

const slots = computed(() =>
  props.itemCards.flatMap((item) =>
    Array.from({ length: item.amount }, (_, index) => ({
      key: `${item.id}-${index + 1}`,
      name: item.name,
      icon: item.icon,
    })),
  ),
);
