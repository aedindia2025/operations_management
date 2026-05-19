import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ListPageEnhancer() {
  const { pathname } = useLocation();

  useEffect(() => {}, [pathname]);

  return null;
}
