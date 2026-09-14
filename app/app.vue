<template>
  <AppToast />
  <v-app class="site-app">
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator color="#c4b5fd" :height="3" :throttle="0" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <AuthDialog v-if="$route.path !== '/setup'" />
  </v-app>
</template>
