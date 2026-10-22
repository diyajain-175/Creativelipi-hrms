import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    return api
      .get(path)
      .then((value) => {
        setData(value);
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}
