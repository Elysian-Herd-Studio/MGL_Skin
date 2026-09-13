<template>
  <div class="py-4">
    <nav aria-label="控制台导航" class="d-flex flex-wrap ga-2 mb-6">
      <v-btn to="/admin" exact variant="text" color="primary" prepend-icon="mdi-view-dashboard-outline">站点概览</v-btn>
      <v-btn to="/admin/users" variant="text" color="primary" prepend-icon="mdi-account-multiple">用户管理</v-btn>
      <v-btn to="/admin/settings" variant="text" color="primary" prepend-icon="mdi-cog-outline">站点设置</v-btn>
    </nav>
    <slot />
  </div>
</template>
