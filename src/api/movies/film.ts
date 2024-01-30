import { http } from "@/utils/http";
import type { Result, ResultDetail } from "@/api/types";

/** 获取电影列表 */
export const getFilmListApi = (data?: object) => {
  return http.request<Result>("get", "/api/movies/film", {
    params: data
  });
};

export const createFilmApi = (data?: object) => {
  return http.request<Result>("post", "/api/movies/film", {
    data: data
  });
};

export const updateFilmApi = (pk?: string, data?: object) => {
  return http.request<ResultDetail>("put", `/api/movies/film/${pk}`, {
    data: data
  });
};

export const deleteFilmApi = (pk?: string) => {
  return http.request<Result>("delete", `/api/movies/film/${pk}`);
};

export const manyDeleteFilmApi = (data?: object) => {
  return http.request<Result>("delete", `/api/movies/film/many-delete`, {
    params: data
  });
};

export const uploadFilePosterApi = (pk?: string, data?: object) => {
  return http.upload<Result>(`/api/movies/film/${pk}/upload`, {}, data);
};

export const getFilmInfoByDoubanApi = (params?: object) => {
  return http.request<Result>("get", `/api/movies/film/search_douban`, {
    params
  });
};

export const importFilmInfoByDoubanApi = (data?: object) => {
  return http.request<Result>("post", `/api/movies/film/add_douban`, {
    data
  });
};

export const batchAddFileToFilmApi = (pk?: string, data?: object) => {
  return http.request<Result>("post", `/api/movies/film/${pk}/batch/files`, {
    data
  });
};
