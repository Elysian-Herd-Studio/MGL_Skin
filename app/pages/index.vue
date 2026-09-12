<script setup lang="ts">
const { loggedIn, user } = useUserSession()
</script>

<template>
  <v-card elevation="0">
    <v-card-title class="text-h4 px-0">MGL Skin 预设共享平台</v-card-title>
    <v-card-subtitle class="px-0">
      Magicalland 小马预设的分享与联动站点
    </v-card-subtitle>

    <v-card-text class="px-0 mt-4">
      <v-alert v-if="loggedIn" type="success" variant="tonal">
        已登录，欢迎回来，{{ user?.username }}。
      </v-alert>
      <v-alert v-else type="info" variant="tonal">
        当前未登录，<NuxtLink to="/?auth=login">登录</NuxtLink> 或
        <NuxtLink to="/?auth=register">注册</NuxtLink> 后即可参与预设分享。
      </v-alert>
    </v-card-text>
  </v-card>
</template>
