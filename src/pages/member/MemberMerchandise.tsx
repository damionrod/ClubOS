import { useEffect, useState } from 'react';
import { Image as ImageIcon, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { notifyError, notifySuccess } from '@/lib/notifications';

type Product = {
  id: string;
  name: string;
  description: string | null;
  sizes: string[] | null;
  price: number;
  stock_quantity: number;
  status: string;
  image_url_1: string | null;
  image_url_2: string | null;
};

export function MemberMerchandise() {
  const { activeOrg, profile } = useAuth();
  const { currency } = useOrganisationCurrency();

  const [rows, setRows] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeOrg) return;

    setLoading(true);
    setError('');

    supabase
      .from('merchandise_products')
      .select('*')
      .eq('organisation_id', activeOrg.id)
      .eq('status', 'active')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setRows([]);
        } else {
          const products = (data ?? []) as Product[];
          setRows(products);
          setQuantities(
            Object.fromEntries(products.map((product) => [product.id, 1])),
          );
          setSelectedSizes(
            Object.fromEntries(products.map((product) => [product.id, product.sizes?.[0] ?? ''])),
          );
        }
        setLoading(false);
      });
  }, [activeOrg?.id]);

  function setQuantity(product: Product, value: number) {
    const max = Math.max(1, Math.min(product.stock_quantity, 20));
    const next = Math.max(1, Math.min(value, max));
    setQuantities((current) => ({ ...current, [product.id]: next }));
  }

  async function purchase(product: Product) {
    if (!activeOrg || !profile || purchasing) return;

    const quantity = quantities[product.id] ?? 1;
    const selectedSize = selectedSizes[product.id] ?? '';

    if ((product.sizes?.length ?? 0) > 0 && !selectedSize) {
      notifyError('Please select a size.');
      return;
    }

    if (product.stock_quantity <= 0) {
      notifyError('This item is out of stock.');
      return;
    }

    if (quantity > product.stock_quantity) {
      notifyError(`Only ${product.stock_quantity} item(s) are available.`);
      return;
    }

    setPurchasing(product.id);

    const { error: orderError } = await supabase.from('merchandise_orders').insert({
      organisation_id: activeOrg.id,
      product_id: product.id,
      purchaser_user_id: profile.id,
      quantity,
      unit_price: Number(product.price),
      total_amount: Number(product.price) * quantity,
      payment_status: Number(product.price) === 0 ? 'free' : 'pending',
      selected_size: selectedSize || null,
    });

    setPurchasing('');

    if (orderError) {
      notifyError(orderError.message);
      return;
    }

    notifySuccess(
      Number(product.price) === 0
        ? `${product.name} added successfully.`
        : `${product.name} order created. Payment is pending.`,
    );

    setQuantities((current) => ({ ...current, [product.id]: 1 }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shop</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse club merchandise and purchase directly from each product.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="card h-96 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 font-semibold text-slate-900">No merchandise available</h3>
          <p className="mt-1 text-sm text-slate-500">
            New club products will appear here when they are available.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((product) => {
            const quantity = quantities[product.id] ?? 1;
            const outOfStock = product.stock_quantity <= 0;
            const total = Number(product.price) * quantity;
            const images = [product.image_url_1, product.image_url_2].filter(Boolean);

            return (
              <div key={product.id} className="card overflow-hidden">
                <div className="relative bg-slate-100">
                  {images.length > 0 ? (
                    <div className={images.length > 1 ? 'grid grid-cols-2' : ''}>
                      {images.map((url, index) => (
                        <img
                          key={index}
                          src={url!}
                          alt={`${product.name} ${index + 1}`}
                          className="h-52 w-full object-cover"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center text-slate-300">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}

                  {outOfStock && (
                    <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
                      Out of stock
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {product.name}
                      </h2>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                        {product.sizes?.length ? `${product.sizes.length} size option${product.sizes.length === 1 ? '' : 's'}` : 'One size'}
                      </p>
                    </div>

                    <p className="shrink-0 text-lg font-bold text-primary-700">
                      {formatCurrency(Number(product.price), currency)}
                    </p>
                  </div>

                  {product.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                      {product.description}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    {outOfStock
                      ? 'Currently unavailable'
                      : `${product.stock_quantity} in stock`}
                  </p>

                  {(product.sizes?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Size</label>
                      <select
                        className="input w-full"
                        value={selectedSizes[product.id] ?? ''}
                        onChange={(e) =>
                          setSelectedSizes((current) => ({
                            ...current,
                            [product.id]: e.target.value,
                          }))
                        }
                      >
                        {product.sizes!.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        disabled={outOfStock || quantity <= 1}
                        onClick={() => setQuantity(product, quantity - 1)}
                        className="flex h-10 w-10 items-center justify-center hover:bg-slate-50 disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <span className="min-w-10 text-center text-sm font-semibold">
                        {outOfStock ? 0 : quantity}
                      </span>

                      <button
                        type="button"
                        disabled={
                          outOfStock ||
                          quantity >= Math.min(product.stock_quantity, 20)
                        }
                        onClick={() => setQuantity(product, quantity + 1)}
                        className="flex h-10 w-10 items-center justify-center hover:bg-slate-50 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {!outOfStock && (
                      <span className="text-sm text-slate-600">
                        Total: <strong>{formatCurrency(total, currency)}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-primary mt-4 w-full justify-center"
                    disabled={outOfStock || purchasing === product.id}
                    onClick={() => purchase(product)}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {purchasing === product.id ? 'Adding…' : 'Buy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
