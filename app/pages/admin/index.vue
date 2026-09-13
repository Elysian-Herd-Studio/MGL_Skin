<script setup lang="ts">
import type { AdminOverview } from '../../../shared/types/settings'

definePageMeta({ layout: 'admin', middleware: ['admin'] })
useSeoMeta({ title: '控制台 · MGL Skin', robots: 'noindex, nofollow' })

const { user } = useUserSession()
const { data, pending, error, refresh } = await useFetch<AdminOverview>('/api/admin/overview')
const statistics = computed(() => [
  { title: '用户总数', value: data.value?.users ?? 0, icon: 'mdi-account-group-outline' },
  { title: '管理员', value: data.value?.admins ?? 0, icon: 'mdi-shield-account-outline' },
  { title: '共享皮肤', value: data.value?.presets ?? 0, icon: 'mdi-image-multiple-outline' },
  { title: '待验证邮箱', value: data.value?.unverifiedUsers ?? 0, icon: 'mdi-email-outline' }
])
const mailService = computed(() => data.value
  ? `${data.value.mail.preset === 'resend' ? 'Resend' : '自定义'} · ${data.value.mail.transport.toUpperCase()}`
  : '')
</script>

<template>
  <div class="py-4">
    <header class="mb-8">
      <h1 class="text-h4 font-weight-bold mb-3">控制台</h1>
      <p class="text-body-1 text-medium-emphasis">{{ user?.username }}，在这里管理站点、用户和邮件服务。</p>
    </header>

    <v-alert v-if="error" type="error" variant="tonal" rounded="xl">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <span>无法加载站点概览，请稍后重试。</span>
        <v-btn variant="text" @click="refresh()">重新加载</v-btn>
      </div>
    </v-alert>

    <template v-else>
      <v-row class="mb-4">
        <v-col v-for="item in statistics" :key="item.title" cols="12" sm="6" lg="3">
          <v-skeleton-loader v-if="pending" type="list-item-avatar-two-line" class="rounded-xl" />
          <v-card v-else color="grey-lighten-4">
            <v-card-text class="d-flex align-center ga-4 pa-6">
              <v-avatar color="primary" variant="tonal" rounded="xl" size="48">
                <v-icon :icon="item.icon" />
              </v-avatar>
              <div>
                <p class="text-body-2 text-medium-emphasis mb-1">{{ item.title }}</p>
                <p class="text-h4 font-weight-bold">{{ item.value }}</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-if="data">
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-6">
              <h2 class="text-h6 mb-3">用户管理</h2>
              <p class="text-body-2 text-medium-emphasis mb-6">查找用户，调整管理员与成员用户组，管理邮箱验证状态。</p>
              <v-btn to="/admin/users" color="primary" variant="tonal" prepend-icon="mdi-account-group-outline">管理用户</v-btn>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-text class="pa-6">
              <div class="d-flex align-center flex-wrap ga-3 mb-4">
                <h2 class="text-h6">站点与邮件</h2>
                <v-chip :color="data.mail.configured ? 'success' : 'warning'" size="small" variant="tonal">
                  {{ data.mail.configured ? '已配置' : '待配置' }}
                </v-chip>
              </div>
              <dl class="admin-overview__details text-body-2 mb-6">
                <dt class="text-medium-emphasis">站点地址</dt>
                <dd>{{ data.siteUrl }}</dd>
                <dt class="text-medium-emphasis">邮件服务</dt>
                <dd>{{ mailService }}</dd>
                <dt class="text-medium-emphasis">发件人</dt>
                <dd>{{ data.mail.from || '尚未设置' }}</dd>
              </dl>
              <v-btn to="/admin/settings" color="primary" variant="tonal" prepend-icon="mdi-cog-outline">管理设置</v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.admin-overview__details {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px 20px;
}

.admin-overview__details dd {
  overflow-wrap: anywhere;
}
</style>
