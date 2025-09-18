export class FormsHelper {
  static toFormData<T extends Object>(obj: T): FormData {
    const formData = new FormData();
    formData.append('Content-Type', 'multipart/form-data');
    Object.keys(obj).forEach((key) => {
      const value = (obj as any)[key];
      if (Array.isArray(value)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    return formData;
  }
}
