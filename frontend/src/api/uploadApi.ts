import axiosClient from "./axiosClient";

export const uploadApi = {
  uploadImagen: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const res = await axiosClient.post<{ secure_url: string; public_id: string }>("/uploads/imagen", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return res.data.secure_url;
  },
};
