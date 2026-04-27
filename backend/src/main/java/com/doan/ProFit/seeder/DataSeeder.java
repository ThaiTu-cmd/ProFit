package com.doan.ProFit.seeder;

import com.doan.ProFit.entity.Category;
import com.doan.ProFit.entity.Product;
import com.doan.ProFit.repository.CategoryRepository;
import com.doan.ProFit.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Override
    public void run(String... args) {
        List<Category> categories = categoryRepository.findAll();
        if (categories.isEmpty()) {
            log.info("[Seeder] No categories found, skipping product seed.");
            return;
        }
        if (productRepository.count() > 0) {
            log.info("[Seeder] Products already exist, skipping seed.");
            return;
        }
        Category wheyCat = categories.stream()
                .filter(c -> "Whey Protein".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category creatCat = categories.stream()
                .filter(c -> "Creatine".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category preCat = categories.stream()
                .filter(c -> "Pre-Workout".equalsIgnoreCase(c.getName())).findFirst().orElse(null);
        Category vitCat = categories.stream()
                .filter(c -> c.getName() != null && c.getName().toLowerCase().contains("vitamin")).findFirst().orElse(null);

        seedProduct("OPT-WHEY-001", "opt-whey-gold-227",
                "Gold Standard Whey 2.27kg",
                "Whey protein tiêu chuẩn vàng, 24g protein mỗi lần dùng",
                "Gold Standard 100% Whey là dòng whey protein bán chạy nhất thế giới. Mỗi khẩu phần cung cấp 24g protein chất lượng cao, 5.5g BCAA tự nhiên và 4g Glutamine.",
                new BigDecimal("1850000"), new BigDecimal("2200000"),
                50, true, wheyCat);

        seedProduct("MUS-CREAT-001", "muscle-creat-400",
                "Platinum Creatine 400g",
                "Creatine Monohydrate siêu nguyên chất, tăng sức mạnh tối đa",
                "Platinum 100% Creatine cung cấp 5g Creatine Monohydrate tinh khiết nhất mỗi khẩu phần. Nghiên cứu chứng minh tăng sức mạnh, sức bền và khả năng phục hồi cơ bắp.",
                new BigDecimal("420000"), null,
                80, true, creatCat);

        seedProduct("C4-PREWORK-001", "c4-prework-60",
                "Original Pre-Workout 60 lần dùng",
                "Năng lượng bùng nổ trước khi tập, tập trung cao độ",
                "C4 Original là dòng pre-workout bán chạy số 1 nước Mỹ. Công thức độc quyền giúp bạn có năng lượng tức thì, tập trung cao và pump cơ mạnh.",
                new BigDecimal("680000"), new BigDecimal("790000"),
                30, true, preCat);

        seedProduct("OPT-VIT-001", "opti-men-vitamin",
                "Opti-Men Vitamin tổng hợp",
                "75+ thành phần dinh dưỡng thiết yếu cho nam giới",
                "Opti-Men là công thức vitamin đa vi chất toàn diện dành cho nam giới năng động. Cung cấp hơn 75 thành phần bao gồm vitamin, khoáng chất, axit amin và thảo dược.",
                new BigDecimal("580000"), null,
                40, true, vitCat);

        seedProduct("DYM-ISO-001", "dymatize-iso100-227",
                "ISO100 Hydrolyzed Whey 2.27kg",
                "Whey thủy phân hấp thu nhanh nhất, dành cho vận động viên",
                "ISO100 sử dụng công nghệ thủy phân tiên tiến cho tốc độ hấp thu nhanh nhất. Chứa 25g protein, dưới 1g đường và chất béo.",
                new BigDecimal("2200000"), new BigDecimal("2500000"),
                25, true, wheyCat);

        seedProduct("LEG-PREWORK-001", "legion-pulse-20",
                "Pulse Pre-Workout 20 lần dùng",
                "Pre-workout không caffeine tổng hợp, chỉ nguyên liệu tự nhiên",
                "Pulse là pre-workout dùng nguyên liệu hoàn toàn tự nhiên, không chứa phẩm màu và hương liệu nhân tạo.",
                new BigDecimal("750000"), null,
                20, true, preCat);

        seedProduct("ALL-CREAT-001", "allmax-creatine-hmb",
                "Creatine HMB 315g",
                "Kết hợp Creatine + HMB tăng cơ và giảm mỡ đồng thời",
                "Creatine HMB kết hợp hoàn hảo giữa Creatine Monohydrate và HMB. Nghiên cứu lâm sàng cho thấy hiệu quả tăng cơ vượt trội.",
                new BigDecimal("540000"), new BigDecimal("620000"),
                0, false, creatCat);

        seedProduct("NOW-BCAA-001", "now-foods-bcaa",
                "BCAA 2:1:1 Powder 340g",
                "BCAA tỉ lệ vàng 2:1:1, phục hồi cơ sau tập nhanh hơn",
                "NOW BCAA 2:1:1 cung cấp 5g Leucine, Isoleucine và Valine theo tỷ lệ 2:1:1 được khoa học chứng minh.",
                new BigDecimal("390000"), null,
                35, true, vitCat);

        log.info("[Seeder] Done seeding {} products.", productRepository.count());
    }

    private void seedProduct(String sku, String slug, String name, String shortDesc,
                             String desc, BigDecimal price, BigDecimal oldPrice,
                             int stock, boolean active, Category category) {
        if (category == null) {
            log.warn("[Seeder] Skipping product {} - category not found", name);
            return;
        }
        Product p = new Product();
        p.setSku(sku);
        p.setSlug(slug);
        p.setName(name);
        p.setShortDescription(shortDesc);
        p.setDescription(desc);
        p.setPrice(price);
        p.setOldPrice(oldPrice);
        p.setStockQuantity(stock);
        p.setActive(active);
        p.setCategory(category);
        p.setRatingAvg(BigDecimal.ZERO);
        p.setRatingCount(0);
        productRepository.save(p);
        log.info("[Seeder]  Seeded: {} ({})", name, sku);
    }
}
