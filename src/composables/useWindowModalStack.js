import { computed, inject, provide, ref } from "vue";

const windowModalStackKey = Symbol("windowModalStack");

export function useWindowModalStack() {
  const modalStack = ref([]);

  const activeModal = computed(() => (
    modalStack.value.length > 0 ? modalStack.value[modalStack.value.length - 1] : null
  ));

  function openModal(modal) {
    if (!modal?.type) {
      return;
    }
    modalStack.value = [...modalStack.value, modal];
  }

  function closeTopModal() {
    if (modalStack.value.length === 0) {
      return;
    }
    modalStack.value = modalStack.value.slice(0, -1);
  }

  function removeModal(type) {
    const index = modalStack.value.map((modal) => modal.type).lastIndexOf(type);
    if (index < 0) {
      return;
    }
    modalStack.value = modalStack.value.filter((_, modalIndex) => modalIndex !== index);
  }

  function hasModal(type) {
    return modalStack.value.some((modal) => modal.type === type);
  }

  function syncModal(type, isOpen, payload = {}) {
    if (isOpen) {
      if (hasModal(type)) {
        modalStack.value = modalStack.value.map((modal) => (
          modal.type === type ? { ...modal, ...payload, type } : modal
        ));
        return;
      }
      openModal({ type, ...payload });
      return;
    }
    removeModal(type);
  }

  function clearModals() {
    modalStack.value = [];
  }

  return {
    activeModal,
    openModal,
    closeTopModal,
    removeModal,
    hasModal,
    syncModal,
    clearModals,
  };
}

export function provideWindowModalStack(stack) {
  provide(windowModalStackKey, stack);
}

export function useWindowModalStackContext() {
  return inject(windowModalStackKey, null);
}
