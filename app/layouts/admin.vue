<script setup lang="ts">
const { mdAndUp } = useDisplay()
const drawer = ref(mdAndUp.value)
</script>

<template>
  <div>
    <AppHeader />
    <v-navigation-drawer v-model="drawer" :permanent="mdAndUp" :temporary="!mdAndUp" width="220">
      <v-list nav>
        <v-list-subheader>控制台</v-list-subheader>
        <v-list-item to="/admin" exact prepend-icon="mdi-view-dashboard-outline" title="站点概览" />
        <v-list-item to="/admin/users" prepend-icon="mdi-account-multiple" title="用户管理" />
        <v-list-item to="/admin/settings" prepend-icon="mdi-cog-outline" title="站点设置" />
        <v-list-item to="/" prepend-icon="mdi-home" title="返回首页" />
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <v-container class="site-container">
        <v-btn v-if="!mdAndUp" variant="tonal" prepend-icon="mdi-menu" class="mb-4" @click="drawer = !drawer">控制台导航</v-btn>
        <slot />
      </v-container>
    </v-main>
  </div>
</template>
