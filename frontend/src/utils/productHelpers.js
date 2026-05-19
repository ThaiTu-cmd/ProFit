export const formatPrice = (price) => {
  const safePrice = Number(price) || 0;
  return `${safePrice.toLocaleString("vi-VN")}đ`;
};

export const renderStars = (rating) => {
  const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
};

const pickProductImageByCategory = (categoryName = "") => {
  const normalized = categoryName.toLowerCase();

  if (normalized.includes("whey")) return "/images/whey/whey-gold.png";
  if (normalized.includes("creatine") || normalized.includes("creatin"))
    return "/images/creatin/creatine-platinum.png";
  if (normalized.includes("pre"))
    return "/images/pre-workout/c4-preworkout.png";
  if (normalized.includes("vitamin") || normalized.includes("bcaa"))
    return "/images/vitamin/optimen-vitamin.png";

  return "/images/banners/banner-new.png";
};

export const mapProductFromApi = (item) => {
  const price = Number(item?.price ?? 0);
  const oldPriceRaw = item?.oldPrice == null ? null : Number(item.oldPrice);
  const oldPrice = oldPriceRaw && oldPriceRaw > price ? oldPriceRaw : null;
  const ratingAvg = Number(item?.ratingAvg ?? 0);
  const ratingCount = Number(item?.ratingCount ?? 0);
  const stockQuantity = Number(item?.stockQuantity ?? 0);
  const imageUrl = item?.imageUrl?.trim();

  return {
    id: item?.id,
    slug: item?.slug || "",
    sku: item?.sku || "",
    name: item?.name || "Sản phẩm",
    brand: item?.sku ? item.sku.split("-")[0] : "ProFit",
    shortDesc: item?.shortDescription || "",
    fullDesc: item?.description || item?.shortDescription || "",
    image: imageUrl || pickProductImageByCategory(item?.categoryName),
    price,
    oldPrice,
    rating: Math.round(ratingAvg),
    reviews: ratingCount,
    badge: oldPrice ? "SALE" : "",
    categoryId: item?.categoryId,
    categoryName: item?.categoryName || "Khác",
    inStock: stockQuantity > 0,
    stockQuantity,
    isActive: Boolean(item?.isActive),
    flavors: ["Mặc định"],
    weight: "Đang cập nhật",
    servings: 1,
  };
};

export const buildCategoryList = (
  categoriesFromApi = [],
  mappedProducts = [],
) => {
  const countByCategory = mappedProducts.reduce((acc, product) => {
    const key = product.categoryId;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const dynamicCategories = categoriesFromApi.map((category) => ({
    id: category.id,
    name: category.name,
    count: countByCategory[category.id] || 0,
    icon: "",
  }));

  return [
    {
      id: 0,
      name: "Tất cả",
      count: mappedProducts.length,
      icon: "",
    },
    ...dynamicCategories,
  ];
};
