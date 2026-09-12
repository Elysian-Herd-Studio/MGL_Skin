<script setup lang="ts">
defineProps<{
  message?: string
  type?: 'error' | 'success' | 'info' | 'warning'
}>()
</script>

<template>
  <v-alert
    v-if="message"
    :type="type ?? 'error'"
    variant="tonal"
    density="comfortable"
    class="mb-4"
  >
    {{ message }}
  </v-alert>
</template>
