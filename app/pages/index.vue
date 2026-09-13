<script setup lang="ts">
const { data, pending, error } = await useFetch('/api/skins')
</script>

<template>
  <v-list lines="two">
    <v-list-item v-if="pending" title="加载中..." />
    <v-list-item v-else-if="error" title="加载失败" />
    <v-list-item v-else-if="!data?.items?.length" title="暂无共享预设" />
    <v-list-item
      v-for="item in data?.items ?? []"
      :key="item.id"
      :title="item.name"
      :subtitle="item.username"
    />
  </v-list>
</template>
