<script setup lang="ts">
const { messages } = useToast()
</script>

<template>
  <v-snackbar-queue
    v-model="messages"
    attach="body"
    location="top center"
    variant="tonal"
    rounded="xl"
    min-width="0"
    max-width="min(560px, calc(100vw - 32px))"
    :timeout="5000"
    :total-visible="3"
    :z-index="10000"
    class="app-toast"
  />
</template>

<style>
.app-toast {
  position: fixed;
  inset: 0;
  padding: 0;
  margin: 16px;
  margin-inline-end: calc(16px + var(--v-scrollbar-offset, 0px));
}

.app-toast .v-snackbar__content {
  overflow-wrap: anywhere;
}
</style>
