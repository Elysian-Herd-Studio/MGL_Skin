<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <v-card max-width="440" width="100%" elevation="2">
    <v-card-item>
      <v-card-title class="text-h5">{{ title }}</v-card-title>
      <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    </v-card-item>
    <v-card-text>
      <slot />
    </v-card-text>
    <v-card-actions v-if="$slots.actions" class="px-4 pb-4">
      <slot name="actions" />
    </v-card-actions>
  </v-card>
</template>
