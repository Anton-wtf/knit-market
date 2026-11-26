
import { useEffect, useState } from 'react'
import './App.css'

const categories = ['Все изделия', 'Носки', 'Шарфы', 'Свитера']

const products = [
  {
    id: 1,
    name: 'Цветочное настроение',
    category: 'Носки',
    price: 1500,
    emoji: '🌷',
    color: 'pink',
    tag: 'БЕСТСЕЛЛЕР',
    sizes: ['35–37', '38–40', '41–43'],
    models: ['Розовые цветы', 'Молочные с ромашками', 'Вишнёвые полоски'],
  },
  {
    id: 2,
    name: 'Вишнёвый десерт',
    category: 'Носки',
    price: 1600,
    emoji: '🍒',
    color: 'rose',
    tag: 'НОВИНКА',
    sizes: ['35–37', '38–40', '41–43'],
    models: ['Вишенки', 'Красные сердечки', 'Бордовые полоски'],
  },
  {
    id: 3,
    name: 'Облачный день',
    category: 'Шарфы',
    price: 2900,
    emoji: '☁️',
    color: 'blue',
    tag: 'НЕЖНЫЙ ВЫБОР',
    sizes: ['Короткий', 'Средний', 'Длинный'],
    models: ['Голубое облако', 'Молочный', 'Розово-голубой'],
  },
  {
    id: 4,
    name: 'Клубничное молоко',
    category: 'Шарфы',
    price: 3200,
    emoji: '🍓',
    color: 'pink',
    tag: 'РУЧНАЯ РАБОТА',
    sizes: ['Короткий', 'Средний', 'Длинный'],
    models: ['Клубничный', 'Розовый в полоску', 'Молочный с бантиками'],
  },
  {
    id: 5,
    name: 'Sunday sweater',
    category: 'Свитера',
    price: 7900,
    emoji: '🧶',
    color: 'yellow',
    tag: 'ЛЮБИМЧИК',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    models: ['Масляный жёлтый', 'Молочный', 'Розовый с узором'],
  },
  {
    id: 6,
    name: 'Мятное облако',
    category: 'Свитера',
    price: 8500,
    emoji: '🌿',
    color: 'green',
    tag: 'НОВИНКА',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    models: ['Мятный', 'Шалфейный', 'Молочный с цветами'],
  },
]

function App() {
  const [activeCategory, setActiveCategory] = useState('Все изделия')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderComment, setOrderComment] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [isSendingOrder, setIsSendingOrder] = useState(false)
  const [isOrderComplete, setIsOrderComplete] = useState(false)
  const [orderRequestId, setOrderRequestId] = useState(() => crypto.randomUUID())

  // Загружаем корзину из памяти браузера
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('knit-market-cart')

      if (!savedCart) return []

      const parsedCart = JSON.parse(savedCart)

      if (!Array.isArray(parsedCart)) return []

      return parsedCart.map((item) => ({
        ...item,
        quantity: Math.max(1, Number(item.quantity) || 1),
      }))
    } catch {
      return []
    }
  })

  // Сохраняем корзину после каждого изменения
  useEffect(() => {
    try {
      localStorage.setItem('knit-market-cart', JSON.stringify(cart))
    } catch {
      // Сайт продолжит работать, даже если сохранение недоступно
    }
  }, [cart])

  const filteredProducts =
    activeCategory === 'Все изделия'
      ? products
      : products.filter((product) => product.category === activeCategory)

  // Открытие выбора товара
  const openOrder = (product) => {
    setSelectedProduct(product)
    setSelectedSize('')
    setSelectedModel('')
  }

  // Закрытие окна выбора
  const closeOrder = () => {
    setSelectedProduct(null)
    setSelectedSize('')
    setSelectedModel('')
  }

  // Добавление товара в корзину
  const addToCart = () => {
    if (!selectedProduct || !selectedSize || !selectedModel) return

    const itemId = `${selectedProduct.id}-${selectedSize}-${selectedModel}`

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === itemId
      )

      // Если такой вариант уже есть, увеличиваем количество
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      // Если такого варианта ещё нет, добавляем новую позицию
      return [
        ...currentCart,
        {
          id: itemId,
          productId: selectedProduct.id,
          name: selectedProduct.name,
          category: selectedProduct.category,
          price: selectedProduct.price,
          size: selectedSize,
          model: selectedModel,
          quantity: 1,
        },
      ]
    })

    closeOrder()
  }

  // Изменение количества товара
  const changeQuantity = (itemId, change) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: Math.max(1, item.quantity + change),
            }
          : item
      )
    )
  }

  // Удаление товара из корзины
  const removeFromCart = (itemId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== itemId)
    )
  }

  // Отправка заказа
  const submitOrder = async (event) => {
    event.preventDefault()

    if (isSendingOrder || !customerName.trim() || cart.length === 0) return

    const telegram = window.Telegram?.WebApp
    const initData = telegram?.initData

    if (!initData) {
      setOrderStatus('Открой магазин через Telegram, чтобы оформить заказ.')
      return
    }

    setIsSendingOrder(true)
    setOrderStatus('')

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          orderRequestId,
          name: customerName.trim(),
          comment: orderComment.trim(),
          items: cart.map((item) => ({
            productId: item.productId,
            size: item.size,
            model: item.model,
            quantity: item.quantity,
          })),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Не удалось отправить заказ')
      }

      setOrderStatus('')
      setIsOrderComplete(true)
      setOrderRequestId(crypto.randomUUID())
      setCart([])
      setCustomerName('')
      setOrderComment('')
    } catch (error) {
      setOrderStatus(error.message || 'Ошибка отправки заказа')
    } finally {
      setIsSendingOrder(false)
    }
  }

  // Общее количество изделий
  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  // Общая стоимость корзины
  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <main className="shop" id="home">

      {/* ШАПКА САЙТА */}

      <header className="header">
        <a className="brand" href="#home" aria-label="KNIT MARKET — на главную">
          <span className="brand-top">
            KNIT<span className="brand-flower">✿</span>
          </span>
          <span className="brand-bottom">MARKET</span>
        </a>

        <nav aria-label="Главная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#order">Как заказать</a>
          <a href="#about">О бренде</a>
        </nav>

        <a className="bag" href="#cart">
          <span className="bag-icon">♡</span>
          <span className="bag-label">КОРЗИНА</span>
          <b>{cartCount}</b>
        </a>
      </header>

      {/* БЕГУЩАЯ СТРОКА */}

      <div className="ticker">
        <div className="ticker-track">
          <span className="ticker-group">
            ✿ СВЯЗАНО С ЛЮБОВЬЮ ✿ ТЕПЛО В КАЖДОЙ ПЕТЕЛЬКЕ ✿
            ВЯЖЕМ ДЛЯ ТЕБЯ ✿ НОСИ С УДОВОЛЬСТВИЕМ ✿
          </span>

          <span className="ticker-group" aria-hidden="true">
            ✿ СВЯЗАНО С ЛЮБОВЬЮ ✿ ТЕПЛО В КАЖДОЙ ПЕТЕЛЬКЕ ✿
            ВЯЖЕМ ДЛЯ ТЕБЯ ✿ НОСИ С УДОВОЛЬСТВИЕМ ✿
          </span>
        </div>
      </div>

      {/* ГЛАВНЫЙ ЭКРАН */}

      <section className="hero poster-hero" aria-labelledby="hero-title">

        <div className="poster-sparkle sparkle-one" aria-hidden="true">✧</div>
        <div className="poster-sparkle sparkle-two" aria-hidden="true">✳</div>
        <div className="poster-sparkle sparkle-three" aria-hidden="true">✦</div>

        <div className="poster-rainbow" aria-hidden="true">
          <svg viewBox="0 0 800 290" role="presentation" xmlns="http://www.w3.org/2000/svg">

            <defs>
              <filter id="rainbow-shadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow
                  dx="0"
                  dy="5"
                  stdDeviation="3"
                  floodColor="#493642"
                  floodOpacity="0.13"
                />
              </filter>
            </defs>

            <g
              fill="none"
              stroke="#493642"
              strokeWidth="19"
              strokeLinecap="round"
              filter="url(#rainbow-shadow)"
            >
              <path d="M 105 238 C 155 105, 260 34, 400 34 C 540 34, 645 105, 695 238" />
              <path d="M 143 238 C 190 129, 280 69, 400 69 C 520 69, 610 129, 657 238" />
              <path d="M 181 238 C 225 153, 300 104, 400 104 C 500 104, 575 153, 619 238" />
              <path d="M 219 238 C 260 177, 320 139, 400 139 C 480 139, 540 177, 581 238" />
              <path d="M 257 238 C 294 201, 340 174, 400 174 C 460 174, 506 201, 543 238" />
              <path d="M 295 238 C 326 220, 360 209, 400 209 C 440 209, 474 220, 505 238" />
            </g>

            <g fill="none" strokeWidth="11" strokeLinecap="round">
              <path stroke="#E56E72" d="M 105 238 C 155 105, 260 34, 400 34 C 540 34, 645 105, 695 238" />
              <path stroke="#F3A05D" d="M 143 238 C 190 129, 280 69, 400 69 C 520 69, 610 129, 657 238" />
              <path stroke="#EFD36C" d="M 181 238 C 225 153, 300 104, 400 104 C 500 104, 575 153, 619 238" />
              <path stroke="#83B987" d="M 219 238 C 260 177, 320 139, 400 139 C 480 139, 540 177, 581 238" />
              <path stroke="#75A9D2" d="M 257 238 C 294 201, 340 174, 400 174 C 460 174, 506 201, 543 238" />
              <path stroke="#A38BC5" d="M 295 238 C 326 220, 360 209, 400 209 C 440 209, 474 220, 505 238" />
            </g>

            <g fill="#FFF9E8" stroke="#493642" strokeWidth="5" strokeLinejoin="round">
              <path d="M 22 242 C 8 240 7 222 21 215 C 17 199 31 187 47 193 C 55 176 79 178 87 196 C 105 190 121 203 116 220 C 134 224 137 244 121 253 L 31 253 C 23 253 19 248 22 242 Z" />

              <path d="M 778 242 C 792 240 793 222 779 215 C 783 199 769 187 753 193 C 745 176 721 178 713 196 C 695 190 679 203 684 220 C 666 224 663 244 679 253 L 769 253 C 777 253 781 248 778 242 Z" />
            </g>

          </svg>
        </div>

        <div className="hero-sign">
          <span className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В</span>

          <h1 id="hero-title">
            МИР
            <br />
            <span>ПЕТЕЛЕК</span>
          </h1>

          <p>
            Носки, шарфы и свитера, связанные с любовью.
            Выбирай любимые цвета, рисунки и создавай свой уют.
          </p>

          <a className="main-button" href="#catalog">
            НАЙТИ СВОЮ ВЕЩЬ <span>↗</span>
          </a>
        </div>

        <div className="poster-bottom-note" aria-hidden="true">
          ✿ МАЛЕНЬКИЕ ВЕЩИ — БОЛЬШАЯ ЛЮБОВЬ ✿
        </div>

      </section>

      {/* БЫСТРЫЙ ВЫБОР КАТЕГОРИИ */}

      <section className="category-strip" aria-label="Категории товаров">
        <span>ВЫБИРАЙ СВОЮ ЛЮБИМУЮ ВЕЩЬ</span>

        <a href="#catalog" onClick={() => setActiveCategory('Носки')}>
          ♡ НОСКИ
        </a>

        <a href="#catalog" onClick={() => setActiveCategory('Шарфы')}>
          ✿ ШАРФЫ
        </a>

        <a href="#catalog" onClick={() => setActiveCategory('Свитера')}>
          ☁ СВИТЕРА
        </a>
      </section>

      {/* КАТАЛОГ */}

      <section className="catalog section" id="catalog">

        <div className="section-heading">
          <div>
            <h2>КАТАЛОГ</h2>
            <p>Модели, которые хочется рассматривать и носить.</p>
          </div>

          <span className="heading-doodle" aria-hidden="true">✿ ♡ ☁</span>
        </div>

        <div className="filters" aria-label="Фильтр по категориям">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? 'filter active' : 'filter'}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="products">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>

              <div className={`product-art ${product.color}`}>
                <span className="product-tag">{product.tag}</span>
                <span className="product-emoji" aria-hidden="true">
                  {product.emoji}
                </span>
                <span className="product-sparkle" aria-hidden="true">✳</span>
                <span className="product-category">{product.category}</span>
              </div>

              <div className="product-info">
                <div className="product-description">
                  <h3>{product.name}</h3>
                  <span>{product.category} · ручная работа</span>
                </div>

                <strong>{product.price.toLocaleString('ru-RU')} ₽</strong>
              </div>

              <button
                className="product-button"
                type="button"
                onClick={() => openOrder(product)}
              >
                ВЫБРАТЬ МОДЕЛЬ <span>↗</span>
              </button>

            </article>
          ))}
        </div>

      </section>

      {/* КАК ЗАКАЗАТЬ */}

      <section className="order-info section" id="order">
        <div className="order-info-cloud" aria-hidden="true">☁</div>

        <span className="eyebrow">ВСЁ ПРОСТО И ПОНЯТНО</span>

        <h2>
          ТВОЯ ВЕЩЬ.
          <br />
          <span>ТВОЙ ВЫБОР.</span>
        </h2>

        <div className="steps">
          <div>
            <b>01</b>
            <strong>Изделие</strong>
            <span>Выбери носки, шарф или свитер</span>
          </div>

          <div>
            <b>02</b>
            <strong>Размер</strong>
            <span>Подбери подходящий размер</span>
          </div>

          <div>
            <b>03</b>
            <strong>Модель</strong>
            <span>Выбери рисунок и цвет</span>
          </div>

          <div>
            <b>04</b>
            <strong>Готово!</strong>
            <span>Добавь выбранное в корзину</span>
          </div>
        </div>
      </section>

      {/* КОРЗИНА */}

      <section className="cart-section section" id="cart">

        <div className="section-heading">
          <div>
            <h2>МОЯ <span>КОРЗИНА</span></h2>
          </div>

          <span className="heading-doodle" aria-hidden="true">♡</span>
        </div>

        {cart.length === 0 ? (
          isOrderComplete ? (
            <div className="order-success" role="status" aria-live="polite">
              <span className="order-success-icon">✓</span>
              <span className="eyebrow">KNIT MARKET · ЗАКАЗ ПРИНЯТ</span>
              <h3>УРА! ТВОЙ ЗАКАЗ УЖЕ У НАС ♡</h3>
              <p>Спасибо за доверие! Мы получили твой заказ и скоро свяжемся с тобой в Telegram, чтобы обсудить детали.</p>
              <button
                className="main-button"
                type="button"
                onClick={() => {
                  setIsOrderComplete(false)
                  setOrderStatus('')
                  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                ВЕРНУТЬСЯ В КАТАЛОГ ↗
              </button>
            </div>
          ) : (
            <p className="empty-cart">
              Здесь пока пусто. Самое время выбрать что-нибудь уютное ♡
            </p>
          )
        ) : (
          <>
            <div className="cart-items">

              {cart.map((item) => (
                <article className="cart-item" key={item.id}>

                  <div className="cart-item-details">
                    <strong>{item.name}</strong>

                    <span>
                      {item.category} · {item.size} · {item.model}
                    </span>

                    <small>
                      Цена за штуку: {item.price.toLocaleString('ru-RU')} ₽
                    </small>
                  </div>

                  <div className="cart-item-actions">

                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                        aria-label={`Уменьшить количество: ${item.name}`}
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        aria-label={`Увеличить количество: ${item.name}`}
                      >
                        +
                      </button>
                    </div>

                    <strong className="cart-item-price">
                      {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                    </strong>

                    <button
                      className="cart-remove"
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Удалить
                    </button>

                  </div>

                </article>
              ))}

            </div>

            <div className="cart-total">
              <strong>
                Итого: {total.toLocaleString('ru-RU')} ₽
              </strong>
            </div>

            <form className="checkout-form" onSubmit={submitOrder}>
              <h3>ОФОРМЛЕНИЕ ЗАКАЗА ♡</h3>

              <label htmlFor="customer-name">Как тебя зовут?</label>
              <input
                id="customer-name"
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Твоё имя"
                maxLength={80}
                required
              />

              <label htmlFor="order-comment">Комментарий к заказу</label>
              <textarea
                id="order-comment"
                value={orderComment}
                onChange={(event) => setOrderComment(event.target.value)}
                placeholder="Пожелания или дополнительные детали..."
                maxLength={500}
                rows={3}
              />

              <p>Твой Telegram-аккаунт будет определён автоматически.</p>

              <button
                className="main-button"
                type="submit"
                disabled={isSendingOrder}
              >
                {isSendingOrder ? 'ОТПРАВЛЯЕМ...' : 'ОФОРМИТЬ ЗАКАЗ ♡'}
              </button>

              {orderStatus && <p role="status">{orderStatus}</p>}
            </form>
          </>
        )}

      </section>

      {/* О БРЕНДЕ */}

      <section className="about section" id="about">
        <span>KNIT MARKET ✿</span>

        <h2>
          СВЯЗАНО
          <br />
          С ЛЮБОВЬЮ.
        </h2>

        <p>
          Каждая петелька — немного тепла.
          Каждая вещь — маленькая история.
        </p>

        <div className="about-decor" aria-hidden="true">
          ♡ ✿ ☁ ✳ ✿ ♡
        </div>
      </section>

      {/* ПОДВАЛ */}

      <footer className="footer">
        <strong>KNIT<span>✿</span>MARKET</strong>
        <span>РУЧНАЯ РАБОТА С ЛЮБОВЬЮ · 2026</span>
        <a href="#home">НАВЕРХ ↑</a>
      </footer>

      {/* ОКНО ВЫБОРА ТОВАРА */}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={closeOrder}>

          <section
            className="order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >

            <button
              className="modal-close"
              type="button"
              onClick={closeOrder}
              aria-label="Закрыть"
            >
              ×
            </button>

            <span className="eyebrow">СОЗДАЙ СВОЙ ВАРИАНТ</span>

            <h2 id="modal-title">{selectedProduct.name}</h2>

            <p className="modal-description">
              {selectedProduct.category} · {selectedProduct.price.toLocaleString('ru-RU')} ₽
            </p>

            <label>01. Выбери размер</label>

            <div className="choice-list">
              {selectedProduct.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={selectedSize === size ? 'choice active' : 'choice'}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>

            <label htmlFor="model">02. Выбери рисунок и цвет</label>

            <select
              id="model"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
            >
              <option value="">Выбрать модель...</option>

              {selectedProduct.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            <div className="modal-summary">
              <span>ТВОЙ ВАРИАНТ</span>
              <strong>{selectedSize || 'Размер не выбран'}</strong>
              <strong>{selectedModel || 'Модель не выбрана'}</strong>
              <b>{selectedProduct.price.toLocaleString('ru-RU')} ₽</b>
            </div>

            <button
              className="main-button modal-submit"
              type="button"
              disabled={!selectedSize || !selectedModel}
              onClick={addToCart}
            >
              ДОБАВИТЬ В КОРЗИНУ ♡
            </button>

          </section>
        </div>
      )}

    </main>
  )
}

export default App
