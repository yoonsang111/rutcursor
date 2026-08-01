import React from 'react';
import { Star, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { Product } from '../data';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col w-[200px] md:w-[240px] shrink-0 h-full relative">
      {/* Image Container */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 mb-3 isolate shadow-sm">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isRecommended && (
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-sm">
              에디터 픽
            </div>
          )}
          <div className="bg-white/90 text-slate-800 backdrop-blur-md border border-white/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit shadow-sm">
            {product.categoryId === 'ticket' ? '티켓/패스' : 
             product.categoryId === 'tour' ? '투어' :
             product.categoryId === 'spa' ? '스파/마사지' :
             product.categoryId === 'class' ? '클래스' : '액티비티'}
          </div>
        </div>
      </div>

      {/* Info Container */}
      <div className="flex flex-col px-1 flex-1">
        {/* Rating */}
        <div className="flex items-center gap-1 text-slate-600 mb-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold text-slate-700">{product.rating}</span>
          <span className="text-[10px] text-slate-400">({product.reviews.toLocaleString()})</span>
        </div>
        
        {/* Title: Reduced font size and truncated to one line */}
        <h3 className="font-bold text-slate-800 text-[13px] md:text-sm truncate mb-3" title={product.name}>
          {product.name}
        </h3>

        {/* Price & Action */}
        <div className="flex items-end justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium mb-0.5">최저가 비교</span>
            <div className="font-extrabold text-[15px] md:text-base text-slate-900 tracking-tight">
              {product.price.toLocaleString()}<span className="text-xs font-normal text-slate-500 ml-0.5">원~</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}