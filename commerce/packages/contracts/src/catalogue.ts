import type {Family} from './pricing.js';

/**
 * The four product families plus the made-to-order wristwatch line (Section 02). Category-required attributes are
 * checked by the publish gate; filterable ones drive facets. Taxonomy itself (categories, options) is data in MySQL;
 * these definitions describe what a family must record about each item. Codes are globally unique (shared concepts
 * such as origin are prefixed by family) because filters use them as query keys (attr_<code>).
 */
export type AttributeDef = {code: string; label: string; type: 'INT' | 'DECIMAL' | 'TEXT' | 'ENUM' | 'BOOL'; unit?: string; required: boolean; filterable: boolean; options?: string[]; min?: number; max?: number};

export const FAMILIES: {family: Family; slug: string; title: string; productType: 'PRODUCT' | 'CUSTOM_REQUEST'; attributes: AttributeDef[]}[] = [
  {family: 'RUDRAKSHA', slug: 'rudraksha', title: 'Rudraksha', productType: 'PRODUCT', attributes: [
    {code: 'mukhi_count', label: 'Mukhi', type: 'INT', required: true, filterable: true, min: 1, max: 27},
    {code: 'rudraksha_origin', label: 'Origin', type: 'ENUM', required: true, filterable: true, options: ['Nepal', 'Java (Indonesia)', 'India']},
    {code: 'bead_type', label: 'Form', type: 'ENUM', required: true, filterable: true, options: ['Single bead', 'Bracelet', 'Mala', 'Kavach', 'Combination', 'Collector piece']},
    {code: 'bead_diameter_mm', label: 'Bead size', type: 'DECIMAL', unit: 'mm', required: true, filterable: true},
    {code: 'certification_status', label: 'Certification', type: 'ENUM', required: true, filterable: true, options: ['None', 'Pending', 'Certified']},
    {code: 'stringing', label: 'Stringing', type: 'TEXT', required: false, filterable: false},
  ]},
  {family: 'GEMSTONE', slug: 'gemstones', title: 'Gemstones', productType: 'PRODUCT', attributes: [
    {code: 'gemstone_mineral', label: 'Mineral', type: 'TEXT', required: true, filterable: true},
    {code: 'variety', label: 'Variety', type: 'TEXT', required: true, filterable: true},
    {code: 'carat_weight', label: 'Weight (carat)', type: 'DECIMAL', unit: 'ct', required: true, filterable: true},
    {code: 'ratti_weight', label: 'Weight (ratti)', type: 'DECIMAL', unit: 'ratti', required: false, filterable: true},
    {code: 'shape', label: 'Shape', type: 'TEXT', required: true, filterable: true},
    {code: 'treatment', label: 'Treatment', type: 'ENUM', required: true, filterable: true, options: ['Untreated', 'Heated', 'Oiled', 'Other (disclosed)', 'Lab-created']},
    {code: 'gemstone_origin', label: 'Origin', type: 'TEXT', required: true, filterable: true},
    {code: 'color', label: 'Colour', type: 'TEXT', required: false, filterable: true},
  ]},
  {family: 'CRYSTAL', slug: 'crystals', title: 'Crystals', productType: 'PRODUCT', attributes: [
    {code: 'crystal_mineral', label: 'Crystal', type: 'TEXT', required: true, filterable: true},
    {code: 'product_form', label: 'Form', type: 'ENUM', required: true, filterable: true, options: ['Bracelet', 'Tree', 'Tower', 'Sphere', 'Pyramid', 'Tumble', 'Cluster', 'Raw', 'Décor', 'Plate']},
    {code: 'bead_size_mm', label: 'Bead size', type: 'DECIMAL', unit: 'mm', required: false, filterable: true},
    {code: 'dimensions', label: 'Dimensions', type: 'TEXT', required: false, filterable: false},
    {code: 'crystal_finish', label: 'Finish', type: 'TEXT', required: false, filterable: true},
    {code: 'natural_status', label: 'Natural / treated', type: 'ENUM', required: true, filterable: true, options: ['Natural', 'Dyed', 'Stabilised', 'Synthetic', 'Reconstituted']},
  ]},
  {family: 'YANTRA', slug: 'yantras', title: 'Yantras', productType: 'PRODUCT', attributes: [
    {code: 'yantra_name', label: 'Yantra', type: 'TEXT', required: true, filterable: true},
    {code: 'material', label: 'Material', type: 'ENUM', required: true, filterable: true, options: ['Copper', 'Brass', 'Silver-plated', 'Gold-plated', 'Panchdhatu', 'Crystal', 'Paper / print']},
    {code: 'width_mm', label: 'Width', type: 'DECIMAL', unit: 'mm', required: true, filterable: true},
    {code: 'height_mm', label: 'Height', type: 'DECIMAL', unit: 'mm', required: true, filterable: true},
    {code: 'yantra_finish', label: 'Finish / frame', type: 'TEXT', required: false, filterable: true},
    {code: 'placement_guidance', label: 'Traditional placement', type: 'TEXT', required: false, filterable: false},
  ]},
  {family: 'WATCH', slug: 'custom-wristwatch', title: 'Numerology wristwatch (made to order)', productType: 'CUSTOM_REQUEST', attributes: []},
];

export const familyBySlug = (slug: string) => FAMILIES.find((f) => f.slug === slug);
export const familyOf = (family: Family) => FAMILIES.find((f) => f.family === family);

export type PublishCheck = {code: string; ok: boolean; message: string};
