<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <v-app-bar density="comfortable">
    <v-app-bar-title>
      <NuxtLink to="/" class="text-decoration-none">MGL Skin</NuxtLink>
    </v-app-bar-title>

    <v-spacer />

    <template v-if="loggedIn">
      <v-btn to="/" variant="text" prepend-icon="mdi-home">首页</v-btn>
      <v-btn v-if="user?.role === 'admin'" to="/admin/users" variant="text" prepend-icon="mdi-account-cog" class="ml-2">
        用户管理
      </v-btn>
      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" prepend-icon="mdi-account" class="ml-2">{{ user?.username }}</v-btn>
        </template>
        <v-list>
          <v-list-item to="/account" prepend-icon="mdi-account-details" title="个人资料" />
          <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="logout" />
        </v-list>
      </v-menu>
    </template>

    <template v-else>
      <v-btn to="/?auth=login" :active="false" variant="text" prepend-icon="mdi-login">登录</v-btn>
      <v-btn to="/?auth=register" :active="false" variant="text" prepend-icon="mdi-account-plus" class="ml-2">注册</v-btn>
    </template>
  </v-app-bar>
</template>
