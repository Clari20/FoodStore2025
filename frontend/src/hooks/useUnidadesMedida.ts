import { useQuery } from "@tanstack/react-query";
import { productosApi } from "../api/productosApi";

export const useUnidadesMedida = () => {
  return useQuery({
    queryKey: ["unidadesMedida"],
    queryFn: () => productosApi.getUnidadesMedida(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
