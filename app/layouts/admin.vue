<template>
  <div>
    <AppHeader />
    <v-navigation-drawer permanent width="220">
      <v-list nav>
        <v-list-item to="/admin/users" prepend-icon="mdi-account-multiple" title="用户管理" />
        <v-list-item to="/" prepend-icon="mdi-home" title="返回首页" />
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <v-container class="site-container">
        <slot />
      </v-container>
    </v-main>
  </div>
</template>
