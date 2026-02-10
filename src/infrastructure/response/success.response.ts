export type LangMessage = {
  uz: string;
  ru: string;
};

export interface ISuccess<T = any> {
  statusCode: number;
  message: string | LangMessage;
  data: T;
  meta?: any; // pagination yoki boshqa qo‘shimcha info
}

export const successRes = <T>(
  data: T,
  statusCode = 200,
  message: LangMessage = {
    uz: 'Amaliyot muvaffaqiyatli bajarildi',
    ru: 'Операция успешно выполнена',
  },
  meta?: any,
): ISuccess<T> => {
  const res: ISuccess<T> = { statusCode, message, data };
  if (meta) res.meta = meta;
  return res;
};
