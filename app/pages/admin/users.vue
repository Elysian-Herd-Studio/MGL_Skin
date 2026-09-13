<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { user: currentUser } = useUserSession()

const limit = 20
const searchInput = ref('')
const appliedSearch = ref('')
const page = ref(1)
const actionError = ref('')

const query = computed(() => ({
  page: page.value,
  limit,
  q: appliedSearch.value
}))

const { data, pending, refresh } = await useFetch('/api/admin/users', { query })

const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit)))

function applySearch() {
  page.value = 1
  appliedSearch.value = searchInput.value.trim()
}

function formatTime(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(`${value.replace(' ', 'T')}Z`).toLocaleString()
}

async function patchUser(id: number, payload: { role?: 'user' | 'admin', emailVerified?: boolean }) {
  actionError.value = ''

  try {
    await $fetch(`/api/admin/users/${id}`, { method: 'PATCH', body: payload })
    await refresh()
  } catch (cause) {
    actionError.value = apiErrorMessage(cause)
  }
}

const deleteTarget = ref<{ id: number, username: string } | null>(null)
const deleting = ref(false)

async function confirmDelete() {
  if (!deleteTarget.value) {
    return
  }

  deleting.value = true
  actionError.value = ''

  try {
    await $fetch(`/api/admin/users/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteTarget.value = null
    await refresh()
  } catch (cause) {
    actionError.value = apiErrorMessage(cause)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-h5 mb-4">用户管理</h1>

    <FormAlert :message="actionError" type="error" />

    <v-card class="mb-4">
      <v-card-text class="d-flex align-center ga-2 flex-wrap">
        <v-text-field
          v-model="searchInput"
          label="搜索用户名或邮箱"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          style="max-width: 320px"
          @keyup.enter="applySearch"
        />
        <v-btn color="primary" variant="tonal" @click="applySearch">搜索</v-btn>
        <v-btn variant="text" @click="searchInput = ''; applySearch()">重置</v-btn>
        <v-spacer />
        <span class="text-body-2 text-medium-emphasis">共 {{ total }} 个用户</span>
      </v-card-text>
    </v-card>

    <v-card>
      <v-table>
        <thead>
          <tr>
            <th>用户名</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>邮箱验证</th>
            <th>注册时间</th>
            <th>最近登录</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              {{ item.username }}
              <v-chip v-if="item.id === currentUser?.id" size="x-small" class="ml-1">本人</v-chip>
            </td>
            <td>{{ item.email }}</td>
            <td>
              <v-chip :color="item.role === 'admin' ? 'primary' : 'default'" size="small">
                {{ item.role === 'admin' ? '管理员' : '成员' }}
              </v-chip>
            </td>
            <td>
              <v-icon :color="item.emailVerified ? 'success' : 'warning'" size="small">
                {{ item.emailVerified ? 'mdi-check-circle' : 'mdi-alert-circle' }}
              </v-icon>
            </td>
            <td>{{ formatTime(item.createdAt) }}</td>
            <td>{{ formatTime(item.lastLoginAt) }}</td>
            <td class="text-right">
              <v-btn
                size="small"
                variant="text"
                :disabled="item.id === currentUser?.id"
                @click="patchUser(item.id, { role: item.role === 'admin' ? 'user' : 'admin' })"
              >
                {{ item.role === 'admin' ? '设为成员' : '设为管理员' }}
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                @click="patchUser(item.id, { emailVerified: !item.emailVerified })"
              >
                {{ item.emailVerified ? '取消验证' : '标记已验证' }}
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                color="error"
                :disabled="item.id === currentUser?.id"
                @click="deleteTarget = { id: item.id, username: item.username }"
              >
                删除
              </v-btn>
            </td>
          </tr>
          <tr v-if="!pending && items.length === 0">
            <td colspan="7" class="text-center text-medium-emphasis py-6">没有匹配的用户</td>
          </tr>
        </tbody>
      </v-table>

      <v-card-actions v-if="pageCount > 1" class="justify-center">
        <v-pagination v-model="page" :length="pageCount" :total-visible="7" />
      </v-card-actions>
    </v-card>

    <v-dialog :model-value="Boolean(deleteTarget)" max-width="420" @update:model-value="deleteTarget = null">
      <v-card>
        <v-card-title>删除用户</v-card-title>
        <v-card-text>
          确定要删除用户「{{ deleteTarget?.username }}」吗？该操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteTarget = null">取消</v-btn>
          <v-btn color="error" variant="tonal" :loading="deleting" @click="confirmDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
