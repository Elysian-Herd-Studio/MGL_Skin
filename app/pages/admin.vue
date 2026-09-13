<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: ['admin'] })
</script>

<template>
  <div>
    <NuxtLayout name="admin">
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
