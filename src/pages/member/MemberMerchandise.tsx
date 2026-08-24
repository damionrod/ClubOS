import { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { FormField, Select } from '@/components/ui/FormField';
import { formatCurrency } from '@/lib/utils';
import { useOrganisationCurrency } from '@/lib/useOrganisationCurrency';
import { notifyError, notifySuccess } from '@/lib/notifications';

type Product = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
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
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
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
          if (products.length === 1) setSelectedId(products[0].id);
        }
        setLoading(false);
      });
  }, [activeOrg?.id]);

  const selected = useMemo(
    () => rows.find((product) => product.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const qty = Math.max(1, Number.parseInt(quantity || '1', 10) || 1);
  const total = selected ? Number(selected.price) * qty : 0;

  async function purchase() {
    if (!activeOrg || !profile || !selected) return;

    if (selected.stock_quantity <= 0) {
      notifyError('This item is out of stock.');
      return;
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > selected.stock_quantity) {
      notifyError(`Please choose a quantity between 1 and ${selected.stock_quantity}.`);
      return;
    }

    setPurchasing(true);

    const { error: orderError } = await supabase.from('merchandise_orders').insert({
      organisation_id: activeOrg.id,
      product_id: selected.id,
      purchaser_user_id: profile.id,
      quantity: qty,
      unit_price: Number(selected.price),
      total_amount: total,
      payment_status: Number(selected.price) === 0 ? 'free' : 'pending',
    });

    setPurchasing(false);

    if (orderError) {
      notifyError(orderError.message);
      return;
    }

    notifySuccess(
      Number(selected.price) === 0
        ? 'Order created successfully.'
        : 'Order created. Payment is now pending.',
    );
    setQuantity('1');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Club Merchandise</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select an item by SKU, choose the quantity and place your order.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="card h-40 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No merchandise is currently available.
        </div>
      ) : (
        <div className="card p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <FormField label="Product / SKU" required>
              <Select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setQuantity('1');
                }}
              >
                <option value="">Select merchandise</option>
                {rows.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku ? `${product.sku} — ` : ''}{product.name} — {formatCurrency(Number(product.price), currency)}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Quantity" required>
              <Select
                value={quantity}
                disabled={!selected || selected.stock_quantity <= 0}
                onChange={(e) => setQuantity(e.target.value)}
              >
                {selected && selected.stock_quantity > 0
                  ? Array.from(
                      { length: Math.min(selected.stock_quantity, 20) },
                      (_, index) => index + 1,
                    ).map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))
                  : <option value="1">0 available</option>}
              </Select>
            </FormField>
          </div>

          {selected && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="grid grid-cols-2 overflow-hidden rounded-xl bg-slate-100">
                  {[selected.image_url_1, selected.image_url_2].map((url, index) =>
                    url ? (
                      <img
                        key={index}
                        src={url}
                        alt={`${selected.name} ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div
                        key={index}
                        className="flex h-40 items-center justify-center text-slate-300"
                      >
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    ),
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        SKU: {selected.sku || 'Not specified'}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-primary-700">
                      {formatCurrency(Number(selected.price), currency)}
                    </p>
                  </div>

                  {selected.description && (
                    <p className="mt-3 text-sm text-slate-600">{selected.description}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>{selected.stock_quantity} available</span>
                    <span>
                      Total: <strong>{formatCurrency(total, currency)}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-primary mt-5"
                    disabled={purchasing || selected.stock_quantity <= 0}
                    onClick={purchase}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {purchasing ? 'Creating order…' : 'Purchase'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
