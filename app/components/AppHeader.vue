<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <v-app-bar density="comfortable" class="app-header">
    <v-app-bar-title class="ms-0">
      <NuxtLink to="/" class="text-decoration-none">MGL Skin</NuxtLink>
    </v-app-bar-title>

    <v-spacer />

    <div class="app-header__actions">
      <template v-if="loggedIn">
        <v-btn to="/" variant="text" prepend-icon="mdi-home">首页</v-btn>
        <v-btn v-if="user?.role === 'admin'" to="/admin/users" variant="text" prepend-icon="mdi-account-cog">
          用户管理
        </v-btn>
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text">
              <template #prepend>
                <UserAvatar :src="user?.avatarUrl" :name="user?.username" :size="28" />
              </template>
              {{ user?.username }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item to="/account" prepend-icon="mdi-account-details" title="个人资料" />
            <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="logout" />
          </v-list>
        </v-menu>
      </template>

      <template v-else>
        <v-btn to="/?auth=login" :active="false" variant="text" prepend-icon="mdi-login">登录</v-btn>
        <v-btn to="/?auth=register" :active="false" variant="text" prepend-icon="mdi-account-plus">注册</v-btn>
      </template>
    </div>
  </v-app-bar>
</template>

<style scoped>
.app-header :deep(.v-toolbar__content) {
  padding-inline: clamp(24px, 4vw, 72px);
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
