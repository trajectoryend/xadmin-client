import dayjs from "dayjs";
import { message } from "@/utils/message";
import { type PaginationProps } from "@pureadmin/table";
import { reactive, ref, h, onMounted, toRaw, type Ref } from "vue";
import {
  deleteNotifyApi,
  getNotifyListApi,
  createNotifyApi,
  manyDeleteNotifyApi,
  updateNotifyApi,
  updateNotifyPublishApi
} from "@/api/system/notify";
import { useRoute, useRouter } from "vue-router";
import { FormItemProps } from "./types";
import editForm from "../editor.vue";
import showForm from "../show.vue";
import { cloneDeep, getKeyList, isEmpty, isString } from "@pureadmin/utils";
import { addDialog } from "@/components/ReDialog/index";
import { hasAuth } from "@/router/utils";
import { ElMessageBox } from "element-plus";

const sortOptions = [
  { label: "添加时间 Descending", key: "-created_time" },
  { label: "添加时间 Ascending", key: "created_time" }
];

export function useNotify(tableRef: Ref) {
  const form = reactive({
    title: "",
    message: "",
    unread: "",
    level: "",
    publish: "",
    owner_id: "",
    ordering: sortOptions[0].key,
    page: 1,
    size: 10
  });
  const router = useRouter();
  const switchLoadMap = ref({});
  const route = useRoute();
  const getParameter = isEmpty(route.params) ? route.query : route.params;
  const formRef = ref();
  const manySelectCount = ref(0);
  const dataList = ref([]);
  const loading = ref(true);
  const choicesDict = ref([]);
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    pageSizes: [5, 10, 20, 50, 100],
    background: true
  });
  const columns: TableColumnList = [
    {
      type: "selection",
      align: "left"
    },
    {
      label: "消息ID",
      prop: "pk",
      minWidth: 100
    },
    {
      label: "消息标题",
      prop: "title",
      minWidth: 120,
      cellRenderer: ({ row }) => <el-text type={row.level}>{row.title}</el-text>
    },
    {
      label: "所属用户ID",
      prop: "owner",
      minWidth: 100
    },
    {
      label: "所属用户信息",
      prop: "owner",
      minWidth: 100,
      cellRenderer: ({ row }) => (
        <el-link onClick={() => onGoDetail(row as any)}>
          {row.owner_info.username ? row.owner_info.username : "/"}
        </el-link>
      )
    },
    {
      label: "是否已读",
      prop: "unread",
      minWidth: 90,
      cellRenderer: ({ row, props }) => (
        <el-tag
          size={props.size}
          type={row.unread === true ? "danger" : ""}
          effect="plain"
        >
          {row.unread === true ? "未读" : "已读"}
        </el-tag>
      )
    },
    {
      label: "是否发布",
      prop: "publish",
      minWidth: 90,
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.publish}
          active-value={true}
          inactive-value={false}
          active-text="已发布"
          inactive-text="未发布"
          disabled={!hasAuth("update:systemNotifyPublish")}
          inline-prompt
          onChange={() => onChange(scope as any)}
        />
      )
    },
    {
      label: "添加时间",
      minWidth: 180,
      prop: "createTime",
      formatter: ({ created_time }) =>
        dayjs(created_time).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
      fixed: "right",
      width: 200,
      slot: "operation"
    }
  ];

  function onGoDetail(row: any) {
    if (row.owner_info && row.owner_info.pk) {
      router.push({
        name: "systemUser",
        query: { pk: row.owner_info.pk }
      });
    }
  }

  function openDialog(title = "新增", row?: FormItemProps) {
    addDialog({
      title: `${title}用户消息`,
      props: {
        formInline: {
          pk: row?.pk ?? "",
          title: row?.title ?? "",
          unread: row?.unread ?? true,
          publish: row?.publish ?? false,
          message: row?.message ?? "",
          level: row?.level ?? "",
          owner: row?.owner ?? "",
          owner_info: row?.owner_info ?? {},
          choicesDict: choicesDict.value,
          owners: row?.owners ?? []
        }
      },
      width: "60%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(editForm, { ref: formRef }),
      beforeSure: (done, { options }) => {
        const FormRef = formRef.value.getRef();
        const curData = options.props.formInline as FormItemProps;
        delete curData?.choicesDict;
        delete curData?.owner_info;
        curData.files = formRef.value.getUploadFiles();

        async function chores(detail) {
          message(detail, {
            type: "success"
          });
          done(); // 关闭弹框
          onSearch(); // 刷新表格数据
        }

        FormRef.validate(valid => {
          if (valid) {
            if (title === "新增") {
              createNotifyApi(curData).then(async res => {
                if (res.code === 1000) {
                  await chores(res.detail);
                } else {
                  message(`操作失败，${res.detail}`, { type: "error" });
                }
              });
            } else {
              curData.owners = [curData.owner];
              delete curData.owner;
              updateNotifyApi(curData.pk, curData).then(async res => {
                if (res.code === 1000) {
                  await chores(res.detail);
                } else {
                  message(`操作失败，${res.detail}`, { type: "error" });
                }
              });
            }
          }
        });
      }
    });
  }

  function showDialog(row?: FormItemProps) {
    addDialog({
      title: `查看用户消息`,
      props: {
        formInline: {
          pk: row?.pk ?? "",
          title: row?.title ?? "",
          unread: row?.unread ?? true,
          publish: row?.publish ?? false,
          message: row?.message ?? "",
          level: row?.level ?? "",
          owner: row?.owner ?? "",
          owner_info: row?.owner_info ?? {},
          choicesDict: choicesDict.value
        }
      },
      width: "70%",
      draggable: true,
      fullscreenIcon: true,
      closeOnClickModal: false,
      contentRenderer: () => h(showForm, { ref: formRef })
    });
  }

  function onChange({ row, index }) {
    ElMessageBox.confirm(
      `确认要<strong>${
        row.publish === false ? "取消发布" : "发布"
      }</strong><strong style="color:var(--el-color-primary)">${
        row.title
      }</strong>用户消息吗?`,
      "系统提示",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        dangerouslyUseHTMLString: true,
        draggable: true
      }
    )
      .then(() => {
        switchLoadMap.value[index] = Object.assign(
          {},
          switchLoadMap.value[index],
          {
            loading: true
          }
        );
        updateNotifyPublishApi(row.pk, { publish: row.publish }).then(res => {
          if (res.code === 1000) {
            switchLoadMap.value[index] = Object.assign(
              {},
              switchLoadMap.value[index],
              {
                loading: false
              }
            );
            message("操作成功", { type: "success" });
          } else {
            message(`操作失败，${res.detail}`, { type: "error" });
          }
        });
      })
      .catch(() => {
        row.publish === false ? (row.publish = true) : (row.publish = false);
      });
  }

  async function handleDelete(row) {
    deleteNotifyApi(row.pk).then(async res => {
      if (res.code === 1000) {
        message("操作成功", { type: "success" });
        onSearch();
      } else {
        message(`操作失败，${res.detail}`, { type: "error" });
      }
    });
  }

  async function handleSizeChange(val: number) {
    form.page = 1;
    form.size = val;
    onSearch();
  }

  async function handleCurrentChange(val: number) {
    form.page = val;
    onSearch();
  }

  function handleSelectionChange(val) {
    manySelectCount.value = val.length;
  }

  function onSelectionCancel() {
    manySelectCount.value = 0;
    // 用于多选表格，清空用户的选择
    tableRef.value.getTableRef().clearSelection();
  }

  function handleManyDelete() {
    if (manySelectCount.value === 0) {
      message("数据未选择", { type: "error" });
      return;
    }
    const manySelectData = tableRef.value.getTableRef().getSelectionRows();
    manyDeleteNotifyApi({
      pks: JSON.stringify(getKeyList(manySelectData, "pk"))
    }).then(async res => {
      if (res.code === 1000) {
        message(`批量删除了${manySelectCount.value}条数据`, {
          type: "success"
        });
        onSearch();
      } else {
        message(`操作失败，${res.detail}`, { type: "error" });
      }
    });
  }

  function onSearch(init = false) {
    if (init) {
      pagination.currentPage = form.page = 1;
      pagination.pageSize = form.size = 10;
    }
    loading.value = true;
    getNotifyListApi(toRaw(form)).then(res => {
      if (res.code === 1000 && res.data) {
        dataList.value = res.data.results;
        pagination.total = res.data.total;
        choicesDict.value = res.choices_dict;
      } else {
        message(`操作失败，${res.detail}`, { type: "error" });
      }
      loading.value = false;
    });
  }

  const resetForm = formEl => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  onMounted(() => {
    if (getParameter) {
      const parameter = cloneDeep(getParameter);
      Object.keys(parameter).forEach(param => {
        if (!isString(parameter[param])) {
          parameter[param] = parameter[param].toString();
        }
      });
      if (parameter.owners) {
        parameter.owners = JSON.parse(parameter.owners);
        openDialog("新增", parameter);
      }
    }
    onSearch();
  });

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    sortOptions,
    manySelectCount,
    choicesDict,
    onSelectionCancel,
    onSearch,
    resetForm,
    openDialog,
    showDialog,
    handleDelete,
    handleManyDelete,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange
  };
}
