<script setup lang="ts">
import type { DatabaseSettings } from '../../shared/types/database'

const model = defineModel<DatabaseSettings>({ required: true })
defineProps<{ disabled?: boolean }>()

const providers = [
  { title: 'SQLite（本地文件）', value: 'sqlite' },
  { title: 'PostgreSQL', value: 'postgresql' }
]
const required = (value: unknown) => Boolean(String(value ?? '').trim()) || '此项不能为空'
</script>

<template>
  <div>
    <v-select
      v-model="model.provider"
      label="数据库类型"
      :items="providers"
      :disabled="disabled"
      class="mb-2"
    />

    <p v-if="model.provider === 'sqlite'" class="text-body-2 text-medium-emphasis">
      数据保存在本机文件中，无需单独部署数据库。
    </p>

    <template v-else>
      <p class="text-body-2 text-medium-emphasis mb-6">请先创建数据库，并使用拥有建表权限的账户连接。完成初始化时会自动创建所需的数据表。</p>
      <v-row>
        <v-col cols="12" sm="8">
          <v-text-field
            v-model="model.postgresql.host"
            label="数据库主机"
            placeholder="localhost"
            autocomplete="off"
            maxlength="253"
            :rules="[required]"
            :disabled="disabled"
            required
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field
            v-model.number="model.postgresql.port"
            label="端口"
            type="number"
            min="1"
            max="65535"
            :rules="[value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 65535 || '请输入有效端口']"
            :disabled="disabled"
            required
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="model.postgresql.database"
            label="数据库名称"
            autocomplete="off"
            maxlength="128"
            :rules="[required]"
            :disabled="disabled"
            required
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="model.postgresql.username"
            label="数据库用户名"
            autocomplete="off"
            maxlength="128"
            :rules="[required]"
            :disabled="disabled"
            required
          />
        </v-col>
      </v-row>
      <v-text-field
        v-model="model.postgresql.password"
        label="数据库密码"
        type="password"
        autocomplete="new-password"
        maxlength="4096"
        :disabled="disabled"
      />
      <v-switch
        v-model="model.postgresql.ssl"
        label="使用 SSL 加密连接"
        color="primary"
        :disabled="disabled"
        hide-details
      />
      <p class="text-body-2 text-medium-emphasis">启用 SSL 时会验证服务器证书，请按数据库服务商的要求选择。</p>
    </template>
  </div>
</template>
