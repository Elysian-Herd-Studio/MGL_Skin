<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const { user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <v-card max-width="560">
    <v-card-item>
      <v-card-title>个人资料</v-card-title>
    </v-card-item>

    <v-card-text>
      <v-list lines="two">
        <v-list-item title="用户名" :subtitle="user?.username" prepend-icon="mdi-account" />
        <v-list-item title="邮箱" :subtitle="user?.email" prepend-icon="mdi-email" />
        <v-list-item
          title="角色"
          :subtitle="user?.role === 'admin' ? '管理员' : '普通用户'"
          prepend-icon="mdi-shield-account"
        />
      </v-list>
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-btn v-if="user?.role === 'admin'" to="/admin/users" variant="tonal" prepend-icon="mdi-account-cog">
        用户管理
      </v-btn>
      <v-spacer />
      <v-btn color="error" variant="tonal" prepend-icon="mdi-logout" @click="logout">退出登录</v-btn>
    </v-card-actions>
  </v-card>
</template>
